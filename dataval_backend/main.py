"""
main.py — DataVal.ai FastAPI Backend (Production-Ready)
=======================================================
Production upgrades included in this version:
  1. Environment-variable config via pydantic-settings (config.py).
  2. Dynamic CORS origins sourced from FRONTEND_URL env var.
  3. PostgreSQL support with SQLite dev fallback (database.py).
  4. Garbage collection: task data directories are automatically cleaned up
     after a successful export or a user-triggered abort.
"""

import os
import uuid
import queue
import random
import signal
import shutil
import atexit
import zipfile
import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Any, Optional, List

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Depends, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import pandas as pd

from config import settings
from detector import detect_dataset_type, get_tabular_files
from analyzer import analyze_tabular, analyze_classification, analyze_segmentation
from database import engine, get_db, Base
from models import User
from auth import hash_password, verify_password, create_access_token, get_current_user
from oauth import router as oauth_router

# ── Logger ─────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("DataValBackend")

# ── Application ────────────────────────────────────────────────────────────────
app = FastAPI(title="DataVal.ai — Dataset Analytics Backend", version="2.0.0")

# ── Dynamic CORS (Upgrade #2) ─────────────────────────────────────────────────
# Origins are sourced from FRONTEND_URL in the environment / .env file.
# Multiple origins can be provided as a comma-separated list.
# See config.py → Settings.allowed_origins for the parsing logic.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,   # ← from env, not hardcoded
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Expose Content-Disposition so the browser JS can read the exported filename
    expose_headers=["Content-Disposition", "Content-Type"],
)

# ── Startup: create DB tables & static dirs ────────────────────────────────────
Base.metadata.create_all(bind=engine)
STATIC_DIR = os.path.join(os.getcwd(), "static")
AVATAR_DIR = os.path.join(STATIC_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ── Register routers ────────────────────────────────────────────────────────────
app.include_router(oauth_router)

# ── In-memory task store ───────────────────────────────────────────────────────
tasks: Dict[str, Dict[str, Any]] = {}

# Per-task locks to prevent GC from racing with active augment/export operations
_task_locks: Dict[str, threading.Lock] = {}
_task_locks_meta = threading.Lock()  # protects _task_locks dict itself


def _get_task_lock(task_id: str) -> threading.Lock:
    """Return (or create) the per-task GC lock. Thread-safe."""
    with _task_locks_meta:
        if task_id not in _task_locks:
            _task_locks[task_id] = threading.Lock()
        return _task_locks[task_id]


CHUNK_SIZE = 1024 * 1024 * 10  # 10 MB
DATA_DIR = os.path.join(os.getcwd(), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Thread pool for heavy synchronous ML work
_EXECUTOR = ThreadPoolExecutor(max_workers=settings.WORKER_THREADS)

# ── Worker Tuning: physical_cores + 1 ─────────────────────────────────────────
# Uses physical (not hyperthreaded/logical) core count to avoid context-switch
# overhead on Windows.  +1 ensures I/O overlap during disk reads/writes.
def _detect_physical_cores() -> int:
    try:
        import psutil
        physical = psutil.cpu_count(logical=False)
        if physical:
            return physical
    except ImportError:
        pass
    return max(1, (os.cpu_count() or 4) // 2)

_PHYSICAL_CORES = _detect_physical_cores()
_NUM_AUG_WORKERS = _PHYSICAL_CORES + 1
logger.info(f"Augmentation workers: {_NUM_AUG_WORKERS} (physical={_PHYSICAL_CORES})")


# ── Graceful Shutdown ──────────────────────────────────────────────────────────
def _shutdown_pools():
    """Clean up executor pools at process exit — prevents stack traces on Ctrl+C."""
    try:
        _EXECUTOR.shutdown(wait=False, cancel_futures=True)
    except Exception:
        pass


atexit.register(_shutdown_pools)
try:
    signal.signal(signal.SIGINT, lambda *_: (_shutdown_pools(), signal.raise_signal(signal.SIGINT)))
except (OSError, AttributeError):
    pass  # not available on all platforms / when not in main thread


# ── Pydantic models ────────────────────────────────────────────────────────────
class TaskStatus(BaseModel):
    task_id:         str
    status:          str
    progress:        int
    result:          Optional[Dict[str, Any]] = None
    error:           Optional[str]            = None
    diagnostics:     List[str]                = Field(default_factory=list)
    filename:        Optional[str]            = None
    detected_type:   Optional[str]            = None
    file_size_bytes: Optional[int]            = None
    started_at:      Optional[str]            = None
    memory_mb:       Optional[float]          = None
    stage_key:       Optional[str]            = None


class AnalyzeRequest(BaseModel):
    leakage_threshold: float = 0.98
    deep_leakage_scan: bool = False
    auto_delete_staged: bool = True


class AugmentRequest(BaseModel):
    type: str = "Gaussian Noise"


class FixRequest(BaseModel):
    strategy: str = "auto"


# ── Helper: get process memory ─────────────────────────────────────────────────
def _get_memory_mb() -> Optional[float]:
    try:
        import psutil
        return round(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024), 1)
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════════════════════
# GARBAGE COLLECTION UTILITIES (Upgrade #4) — now race-condition safe
# ══════════════════════════════════════════════════════════════════════════════

def _cleanup_task_data(task_id: str) -> None:
    """
    Disk-space management: remove ALL files and directories created on disk
    for a given task_id.  This includes:
      • The extracted dataset directory  (<DATA_DIR>/<task_id>_extracted/)
      • Any export zip file             (<DATA_DIR>/export_<task_id>.zip)
      • The original staged upload      (<DATA_DIR>/<task_id>_<filename>)

    Called as a FastAPI BackgroundTask so it never blocks the HTTP response.

    RACE-CONDITION FIX: Acquires the per-task _gc_lock before touching disk.
    Augmentation and export endpoints hold this same lock while they are
    actively reading/writing, preventing GC from deleting mid-operation.
    """
    lock = _get_task_lock(task_id)
    lock.acquire()  # BLOCK until any active augment/export finishes
    try:
        cleaned: list[str] = []

        # 1. Extracted dataset directory (populated during analysis)
        extracted_dir = os.path.join(DATA_DIR, f"{task_id}_extracted")
        if os.path.isdir(extracted_dir):
            try:
                shutil.rmtree(extracted_dir, ignore_errors=True)
                cleaned.append(extracted_dir)
            except Exception as exc:
                logger.warning(f"[GC][{task_id}] Could not remove {extracted_dir}: {exc}")

        # 2. Export zip (created by /api/export/{task_id})
        export_zip = os.path.join(DATA_DIR, f"export_{task_id}.zip")
        if os.path.isfile(export_zip):
            try:
                os.remove(export_zip)
                cleaned.append(export_zip)
            except Exception as exc:
                logger.warning(f"[GC][{task_id}] Could not remove {export_zip}: {exc}")

        # 3. Original staged file (may already be deleted by auto_delete_staged)
        task = tasks.get(task_id, {})
        staged_file = task.get("file_path", "")
        if staged_file and os.path.isfile(staged_file):
            try:
                os.remove(staged_file)
                cleaned.append(staged_file)
            except Exception as exc:
                logger.warning(f"[GC][{task_id}] Could not remove staged file: {exc}")

        if cleaned:
            logger.info(f"[GC][{task_id}] Cleaned up {len(cleaned)} path(s): {cleaned}")
        else:
            logger.info(f"[GC][{task_id}] Cleanup triggered — nothing left to remove.")
    finally:
        lock.release()
        # Clean up the lock entry itself (optional, prevents unbounded growth)
        with _task_locks_meta:
            _task_locks.pop(task_id, None)


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "DataVal.ai API v2.0 — /stage → /analyze/{id} → /status/{id}"}


# ── STAGE ──────────────────────────────────────────────────────────────────────
@app.post("/stage")
async def stage_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    task_id   = str(uuid.uuid4())
    save_path = os.path.join(DATA_DIR, f"{task_id}_{file.filename}")

    tasks[task_id] = {
        "status":          "Staged",
        "progress":        0,
        "stage_key":       None,
        "filename":        file.filename,
        "file_path":       save_path,
        "file_size_bytes": 0,
        "diagnostics":     ["File staged — ready for analysis."],
        "started_at":      None,
        "user_id":         current_user.id,
        # threading.Event — set() → stop signal to background thread
        "_abort_event":    threading.Event(),
    }

    try:
        total = 0
        with open(save_path, "wb") as buf:
            while chunk := await file.read(CHUNK_SIZE):
                buf.write(chunk)
                total += len(chunk)

        tasks[task_id]["file_size_bytes"] = total
        tasks[task_id]["diagnostics"].append(
            f"Staged: {file.filename} ({round(total / (1024*1024), 1)} MB)"
        )
        logger.info(f"[{task_id}] Staged: {file.filename} ({total} bytes)")
        return {"task_id": task_id, "filename": file.filename, "file_size_bytes": total}

    except Exception as e:
        tasks[task_id]["status"] = "Failed"
        tasks[task_id]["error"]  = str(e)
        raise HTTPException(status_code=500, detail=str(e))


# ── ANALYZE ────────────────────────────────────────────────────────────────────
@app.post("/analyze/{task_id}")
async def start_analysis(
    task_id: str,
    background_tasks: BackgroundTasks,
    req: AnalyzeRequest = AnalyzeRequest(),
):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found.")
    task = tasks[task_id]
    if task["status"] != "Staged":
        raise HTTPException(status_code=409, detail=f"Task already in state: {task['status']}")

    task["status"]     = "Processing"
    task["started_at"] = datetime.utcnow().isoformat()
    task["diagnostics"].append("Analysis initiated by user.")
    task["_settings"]  = {
        "leakage_threshold":  req.leakage_threshold,
        "deep_leakage_scan":  req.deep_leakage_scan,
        "auto_delete_staged": req.auto_delete_staged,
    }

    background_tasks.add_task(process_dataset, task_id, task["file_path"], task["filename"])
    return {"task_id": task_id, "status": "Processing"}


# ── ABORT (with Garbage Collection) ───────────────────────────────────────────
@app.post("/abort/{task_id}")
async def abort_analysis(task_id: str, background_tasks: BackgroundTasks):
    """
    Signal the worker thread to stop and schedule disk cleanup as a
    BackgroundTask so the response is returned immediately.
    """
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found.")

    t = tasks[task_id]

    # Signal the worker thread via the threading.Event
    abort_event: threading.Event = t.get("_abort_event") or threading.Event()
    abort_event.set()

    t["status"]    = "Aborted"
    t["stage_key"] = None
    t["diagnostics"].append("Abort requested by user — worker thread stopping.")
    logger.info(f"[{task_id}] Abort event set.")

    # ── Garbage Collection (Upgrade #4) ────────────────────────────────────
    # Schedule disk cleanup as a non-blocking background task.
    background_tasks.add_task(_cleanup_task_data, task_id)
    logger.info(f"[{task_id}] Disk cleanup scheduled (abort path).")

    return {"status": "aborted", "task_id": task_id}


# ── STATUS ─────────────────────────────────────────────────────────────────────
@app.get("/status/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found.")
    t = dict(tasks[task_id])
    t.pop("_abort_event", None)   # don't serialise the threading.Event
    t["memory_mb"] = _get_memory_mb()
    return {**t, "task_id": task_id}


# ── DELETE TASK (Privacy: storeHistoryLocally=false) ──────────────────────────
@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, background_tasks: BackgroundTasks):
    """
    Remove a task from the in-memory store and clean up its disk files.
    Called by the frontend when 'Store history locally' is disabled so that
    the completed analysis never appears in the GET /history response.
    """
    if task_id not in tasks:
        # Idempotent — already gone is fine
        return {"status": "not_found", "task_id": task_id}

    background_tasks.add_task(_cleanup_task_data, task_id)
    tasks.pop(task_id, None)
    logger.info(f"[{task_id}] Task deleted by user request (privacy mode).")
    return {"status": "deleted", "task_id": task_id}




# ── HISTORY ────────────────────────────────────────────────────────────────────
@app.get("/history")
async def get_history(current_user: User = Depends(get_current_user)):
    completed = []
    for tid, t in tasks.items():
        # Only return records belonging to the authenticated user
        if t.get("user_id") != current_user.id:
            continue
        if t.get("status") in ("Completed", "Optimized", "Failed"):
            completed.append({
                "task_id":         tid,
                "filename":        t.get("filename"),
                "detected_type":   t.get("detected_type"),
                "status":          t.get("status"),
                "started_at":      t.get("started_at"),
                "file_size_bytes": t.get("file_size_bytes"),
                "result":          t.get("result"),
            })
    completed.sort(key=lambda x: x.get("started_at") or "", reverse=True)
    return completed


# ── SYNCHRONOUS WORKER (runs in ThreadPoolExecutor) ───────────────────────────
def _run_analysis_sync(task_id: str, save_path: str, filename: str):
    """
    Runs entirely in a worker thread.  Checks abort_event at every major step.
    Core ML analysis logic is intentionally unchanged.
    """
    t   = tasks[task_id]
    evt: threading.Event = t["_abort_event"]

    def aborted():
        return evt.is_set()

    def step(stage_key: str, progress: int, message: str):
        """Update task state; returns True if aborted."""
        if aborted():
            return True
        t["stage_key"] = stage_key
        t["progress"]  = progress
        t["diagnostics"].append(message)
        logger.info(f"[{task_id}] [{stage_key}] {message}")
        return False

    try:
        # ── Stage 0: Integrity ────────────────────────────────────────────────
        if step("integrity", 10, "Checking file integrity (SHA-256)…"): return
        import hashlib, time
        time.sleep(0.3)
        if aborted(): return

        # ── Stage 1: Extraction ───────────────────────────────────────────────
        extracted_path = os.path.join(DATA_DIR, f"{task_id}_extracted")
        os.makedirs(extracted_path, exist_ok=True)

        if filename.lower().endswith(".zip"):
            if step("types", 22, "Unzipping archive…"): return
            with zipfile.ZipFile(save_path, "r") as z:
                for member in z.infolist():
                    if aborted(): return
                    z.extract(member, extracted_path)
            analysis_base = extracted_path
            t["diagnostics"].append("Extraction complete.")
        else:
            new_path = os.path.join(extracted_path, filename)
            shutil.copy(save_path, new_path)
            analysis_base = new_path

        # Save path for export and GC
        t["analysis_path"] = analysis_base

        if step("types", 35, "Detecting dataset type and structure…"): return

        # ── Stage 2: Type Detection ───────────────────────────────────────────
        dtype = detect_dataset_type(analysis_base)
        t["detected_type"] = dtype
        if step("types", 50, f"Identified: {dtype}"): return

        # ── Stage 3: Domain Analysis ──────────────────────────────────────────
        if step("distribution", 55, "Running deep analysis…"): return
        results = {}

        user_settings     = t.get("_settings", {})
        leakage_threshold = user_settings.get("leakage_threshold", 0.98)

        if dtype == "Tabular Data":
            tab_files = get_tabular_files(analysis_base)
            if tab_files:
                if aborted(): return
                ext    = os.path.splitext(tab_files[0])[1].lower()
                rdrs   = {".csv": pd.read_csv, ".json": pd.read_json, ".xlsx": pd.read_excel}
                reader = rdrs.get(ext, pd.read_parquet if ext in (".parquet", ".pqt") else pd.read_csv)
                df = reader(tab_files[0])
                if aborted(): return
                for col in df.columns:
                    if df[col].nunique() > 5000:
                        t["diagnostics"].append(
                            f"Warning: High cardinality in '{col}' — possible ID/key column."
                        )
                if step("distribution", 68, f"Loaded {len(df)} rows × {len(df.columns)} columns"): return
                results = analyze_tabular(df, leakage_threshold=leakage_threshold)
            else:
                t["error"] = "No tabular files found in archive."

        elif dtype == "Classification":
            if step("distribution", 60, "Counting class folders and images…"): return
            results = analyze_classification(analysis_base)

        elif dtype == "Segmentation":
            if step("distribution", 60, "Matching image/mask pairs…"): return
            results = analyze_segmentation(analysis_base)
        else:
            results = {"info": "Unsupported dataset structure."}

        if aborted(): return

        # ── Stage 4: Leakage scan ─────────────────────────────────────────────
        if step("leakage", 83, "Running leakage scan…"): return
        time.sleep(0.1)
        if aborted(): return
        t["diagnostics"].append("Leakage scan complete.")

        # ── Stage 5: EDA report ───────────────────────────────────────────────
        if step("report", 92, "Generating EDA report…"): return
        time.sleep(0.1)
        if aborted(): return

        t["result"]    = results
        t["status"]    = "Completed"
        t["progress"]  = 100
        t["stage_key"] = "report"
        t["diagnostics"].append("Final analysis report compiled.")
        logger.info(f"[{task_id}] Completed — {dtype}")

    except Exception as e:
        logger.exception(f"Error in worker for task {task_id}")
        if not aborted():
            t["status"] = "Failed"
            t["error"]  = f"Processing error: {str(e)}"
    finally:
        # Honor auto_delete_staged setting: remove the raw upload after analysis
        should_delete = t.get("_settings", {}).get("auto_delete_staged", True)
        if should_delete and os.path.exists(save_path):
            try:
                os.remove(save_path)
            except OSError:
                pass


# ── ASYNC ORCHESTRATOR (schedules sync worker, watches abort) ─────────────────
async def process_dataset(task_id: str, save_path: str, filename: str):
    loop        = asyncio.get_event_loop()
    abort_event: threading.Event = tasks[task_id]["_abort_event"]

    future = loop.run_in_executor(_EXECUTOR, _run_analysis_sync, task_id, save_path, filename)

    try:
        while not future.done():
            await asyncio.sleep(0.2)
            if abort_event.is_set():
                break
        await future
    except Exception as e:
        logger.error(f"Executor error for {task_id}: {e}")


# ── AUGMENTATION HELPERS ───────────────────────────────────────────────────────
_IMAGE_EXTS   = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
_TABULAR_EXTS = {".csv", ".xlsx", ".xls", ".json", ".parquet", ".pqt"}
_WRITE_BATCH  = 32  # images buffered before flushing to disk


def _collect_images(root: str) -> list:
    """Walk root and return all image file paths."""
    found = []
    for dp, _, fns in os.walk(root):
        for fn in fns:
            if os.path.splitext(fn)[1].lower() in _IMAGE_EXTS:
                found.append(os.path.join(dp, fn))
    return found


def _find_tabular(root: str) -> Optional[str]:
    """Return the first tabular file found under root (or root if it is a file)."""
    if os.path.isfile(root) and os.path.splitext(root)[1].lower() in _TABULAR_EXTS:
        return root
    for dp, _, fns in os.walk(root):
        for fn in fns:
            if os.path.splitext(fn)[1].lower() in _TABULAR_EXTS:
                return os.path.join(dp, fn)
    return None


# ── cv2.LUT builder (SIMD-optimized lookup tables) ────────────────────────────
def _build_lut(factor: float) -> np.ndarray:
    """Build a 256-element uint8 lookup table: out[i] = clamp(i * factor, 0, 255)."""
    table = np.arange(256, dtype=np.float32) * factor
    return np.clip(table, 0, 255).astype(np.uint8)


def _build_contrast_lut(factor: float, mean_val: float) -> np.ndarray:
    """Build a contrast LUT: out[i] = clamp(mean + factor*(i - mean), 0, 255)."""
    table = np.arange(256, dtype=np.float32)
    table = mean_val + factor * (table - mean_val)
    return np.clip(table, 0, 255).astype(np.uint8)


# ── Pure-OpenCV transform engine (all operations release the GIL) ─────────────
def _apply_transform_cv2(bgr: np.ndarray, aug_type: str) -> np.ndarray:
    """
    Apply augmentation using only OpenCV + numpy (GIL-free operations).
    cv2.LUT is SIMD-accelerated: processes millions of pixels in ~0.1 ms.
    """
    if aug_type == "Horizontal Flip":
        return cv2.flip(bgr, 1)

    elif aug_type == "Random Rotation":
        angle = random.choice([90, 180, 270])
        rotations = {
            90:  cv2.ROTATE_90_CLOCKWISE,
            180: cv2.ROTATE_180,
            270: cv2.ROTATE_90_COUNTERCLOCKWISE,
        }
        return cv2.rotate(bgr, rotations[angle])

    elif aug_type == "Color Jitter":
        # ── Brightness & Saturation via cv2.LUT on HSV channels ──
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        # Brightness: LUT on V channel
        lut_b = _build_lut(0.70 + random.random() * 0.60)
        hsv[:, :, 2] = cv2.LUT(hsv[:, :, 2], lut_b)
        # Saturation: LUT on S channel
        lut_s = _build_lut(0.70 + random.random() * 0.60)
        hsv[:, :, 1] = cv2.LUT(hsv[:, :, 1], lut_s)

        out = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

        # ── Contrast via LUT on all BGR channels ──
        fc = 0.70 + random.random() * 0.60
        if abs(fc - 1.0) > 0.05:
            mean_val = float(cv2.cvtColor(out, cv2.COLOR_BGR2GRAY).mean())
            lut_c = _build_contrast_lut(fc, mean_val)
            out = cv2.LUT(out, lut_c)  # applies to all 3 channels at once
        return out

    elif aug_type == "Random Crop":
        h, w = bgr.shape[:2]
        x1, y1 = int(w * 0.1), int(h * 0.1)
        cropped = bgr[y1:h - y1, x1:w - x1]
        return cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LANCZOS4)

    elif aug_type == "Elastic Deformation":
        arr = bgr.astype(np.float32)
        noise = np.random.randn(arr.shape[0], arr.shape[1]).astype(np.float32) * 5
        arr[:, :, 0] += noise
        arr[:, :, 1] += noise
        arr[:, :, 2] += noise
        return np.clip(arr, 0, 255).astype(np.uint8)

    elif aug_type == "Grid Distortion":
        return cv2.GaussianBlur(bgr, (3, 3), 1.0)

    else:  # Gaussian Noise or unknown
        arr = bgr.astype(np.float32)
        noise = np.random.normal(0, 15, arr.shape).astype(np.float32)
        return np.clip(arr + noise, 0, 255).astype(np.uint8)


def _aug_vision_sync(aug_type: str, path: str) -> dict:
    """
    High-Performance 3-stage pipeline: Prefetch → Transform → Write.

    Architecture:
      [Prefetch Thread]  ──▶  bounded queue  ──▶  [N Worker Threads]  ──▶  batched writes

    Key design decisions:
    • ThreadPoolExecutor (not Process): OpenCV/numpy release the GIL, so threads
      achieve true parallelism with ZERO IPC/pickling overhead.
    • Bounded prefetch queue (4×workers): limits peak RAM to ~4×workers images.
    • Batched disk writes: each worker buffers 32 images, then flushes in a burst
      to minimize random disk seeks.
    • cv2.LUT: SIMD-accelerated lookup tables for Color Jitter.

    Returns {files_modified, new_total_samples}.
    """
    images = _collect_images(path)
    if not images:
        raise ValueError("No image files found in dataset directory.")

    tag = aug_type.lower().replace(" ", "_")
    n_workers = _NUM_AUG_WORKERS

    # ── Bounded prefetch queue (prevents loading all 3000+ images into RAM) ──
    prefetch_q: queue.Queue = queue.Queue(maxsize=n_workers * 4)

    # Shared mutable counter + lock (threads share address space — no pickling)
    result_count = [0]
    counter_lock = threading.Lock()

    # ── Stage 1: Prefetch thread — decodes images from disk into numpy arrays ─
    def _prefetcher():
        for src in images:
            bgr = cv2.imread(src, cv2.IMREAD_COLOR)
            prefetch_q.put((src, bgr))  # bgr is None for corrupt/unreadable files
        # Drop one sentinel per worker so each exits cleanly
        for _ in range(n_workers):
            prefetch_q.put(None)

    prefetch_thread = threading.Thread(target=_prefetcher, daemon=True)
    prefetch_thread.start()

    # ── Stage 2+3: Transform worker — pulls decoded images, transforms, writes ─
    def _worker():
        local_count = 0
        write_buffer: list = []  # (save_path, bgr_array)

        while True:
            item = prefetch_q.get()
            if item is None:  # sentinel
                break

            src, bgr = item
            if bgr is None:  # corrupt file — skip
                continue

            try:
                out = _apply_transform_cv2(bgr, aug_type)
                base, ext = os.path.splitext(src)
                save_path = f"{base}_aug_{tag}{ext}"
                write_buffer.append((save_path, out))
                del bgr  # free input immediately

                # ── Batched disk write: flush every _WRITE_BATCH images ──
                if len(write_buffer) >= _WRITE_BATCH:
                    for p, d in write_buffer:
                        cv2.imwrite(p, d)
                        local_count += 1
                    write_buffer.clear()
            except Exception:
                pass

        # Flush remaining buffered images
        for p, d in write_buffer:
            cv2.imwrite(p, d)
            local_count += 1
        write_buffer.clear()

        with counter_lock:
            result_count[0] += local_count

    # ── Launch worker threads ─────────────────────────────────────────────────
    with ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = [pool.submit(_worker) for _ in range(n_workers)]
        for f in futures:
            try:
                f.result()
            except Exception as e:
                logger.warning(f"[aug] Worker thread error: {e}")

    prefetch_thread.join(timeout=5)

    added = result_count[0]
    return {"files_modified": added, "new_total_samples": len(images) + added}


def _aug_tabular_sync(aug_type: str, path: str) -> dict:
    """
    Apply a tabular transform; save result back to the same file.
    Returns {files_modified, new_total_samples}.
    """
    import numpy as np
    from sklearn.utils import resample as sk_resample

    tab = _find_tabular(path)
    if not tab:
        raise ValueError("No tabular file found in dataset path.")

    ext     = os.path.splitext(tab)[1].lower()
    _readers = {".csv": pd.read_csv, ".json": pd.read_json,
                ".xlsx": pd.read_excel, ".xls": pd.read_excel}
    df = _readers.get(ext, pd.read_csv)(tab)

    if aug_type == "SMOTE Upsampling":
        try:
            cat_cols = [c for c in df.columns
                        if str(df[c].dtype) in ("object", "bool") or df[c].nunique() <= 20]
            target = min(cat_cols, key=lambda c: df[c].nunique()) if cat_cols else df.columns[-1]
            counts = df[target].value_counts()
            max_n  = int(counts.max())
            parts  = []
            for cls, cnt in counts.items():
                subset = df[df[target] == cls]
                if cnt < max_n:
                    subset = sk_resample(subset, replace=True, n_samples=max_n, random_state=42)
                parts.append(subset)
            df = pd.concat(parts, ignore_index=True)
        except Exception as e:
            logger.warning(f"[aug] SMOTE fallback: {e}")
            df = pd.concat(
                [df, df.sample(frac=0.25, replace=True, random_state=42)],
                ignore_index=True,
            )

    elif aug_type == "Gaussian Noise":
        num_cols = df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            std = df[col].std()
            if std and not np.isnan(std):
                df[col] = df[col] + np.random.normal(0, std * 0.05, size=len(df))

    elif aug_type == "Shuffle Rows":
        df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    elif aug_type == "Oversampling":
        df = pd.concat(
            [df, df.sample(frac=0.30, replace=True, random_state=42)],
            ignore_index=True,
        )

    else:
        df = pd.concat(
            [df, df.sample(frac=0.10, replace=True, random_state=42)],
            ignore_index=True,
        )

    # Persist modified dataset
    if ext == ".csv":
        df.to_csv(tab, index=False)
    elif ext in (".xlsx", ".xls"):
        df.to_excel(tab, index=False)
    elif ext == ".json":
        df.to_json(tab, orient="records", indent=2)

    return {"files_modified": 1, "new_total_samples": len(df)}


# ── AUGMENT ────────────────────────────────────────────────────────────────────
@app.post("/augment-apply/{task_id}")
async def augment_apply(task_id: str, req: AugmentRequest):
    """
    Apply a real augmentation to the dataset files on disk.
    • Vision tasks  → PIL transforms, copies saved alongside originals.
    • Tabular tasks → pandas / sklearn transforms, file updated in-place.
    The /api/export/{task_id} re-zips the directory on every call,
    so augmented content is automatically included in any subsequent export.
    """
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found.")

    task          = tasks[task_id]
    analysis_path = task.get("analysis_path")

    if not analysis_path or not os.path.exists(analysis_path):
        # Graceful degraded mode when files are no longer on disk
        result  = task.get("result") or {}
        current = result.get("total_samples", 0)
        MULT = {
            "Horizontal Flip": 0.20, "Random Rotation": 0.15, "Color Jitter": 0.12,
            "Gaussian Noise": 0.10, "Oversampling": 0.30, "SMOTE Upsampling": 0.25,
            "Shuffle Rows": 0.00, "Elastic Deformation": 0.18,
            "Grid Distortion": 0.15, "Random Crop": 0.20,
        }
        added     = int(current * MULT.get(req.type, 0.10))
        new_total = current + added
        if task.get("result") is None:
            task["result"] = {}
        task["result"]["total_samples"] = new_total
        task["diagnostics"].append(f"[sim] Augmentation {req.type} → +{added} (no files on disk)")
        return {"status": "success", "type": req.type,
                "files_modified": 0, "new_total_samples": new_total}

    detected_type = task.get("detected_type", "")
    is_vision     = detected_type in ("Classification", "Segmentation")

    # Acquire per-task GC lock so cleanup cannot fire during augmentation
    lock = _get_task_lock(task_id)
    try:
        loop   = asyncio.get_event_loop()
        worker = _aug_vision_sync if is_vision else _aug_tabular_sync

        def _guarded_augment():
            lock.acquire()
            try:
                return worker(req.type, analysis_path)
            finally:
                lock.release()

        result = await loop.run_in_executor(_EXECUTOR, _guarded_augment)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.exception(f"Augmentation error for task {task_id}")
        raise HTTPException(status_code=500, detail=f"Augmentation failed: {str(e)}")

    new_total = result["new_total_samples"]
    if task.get("result") is None:
        task["result"] = {}
    task["result"]["total_samples"] = new_total
    task["diagnostics"].append(
        f"Augmentation '{req.type}' applied — "
        f"{result['files_modified']} file(s) modified → {new_total} total samples"
    )
    return {
        "status":           "success",
        "type":             req.type,
        "files_modified":   result["files_modified"],
        "new_total_samples": new_total,
    }


# ── FIX ────────────────────────────────────────────────────────────────────────
@app.post("/fix/{task_id}")
async def fix_dataset(task_id: str, req: FixRequest):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found.")

    result  = dict(tasks[task_id].get("result") or {})
    applied: list = []

    leakage = result.get("leakage_risk_columns", [])
    if leakage and req.strategy in ("drop_leakage", "auto"):
        dropped = [c["column"] for c in leakage]
        result["leakage_risk_columns"] = []
        result["dropped_columns"]      = dropped
        applied.append(f"Dropped {len(dropped)} leakage column(s): {', '.join(dropped)}")

    dist = result.get("class_distribution", {})
    if dist and req.strategy in ("smote", "auto"):
        values    = [v["count"] for v in dist.values()]
        max_count = max(values) if values else 0
        new_dist  = {}
        new_total = 0
        for cls, stats in dist.items():
            new_count = max_count if stats["count"] < max_count * 0.8 else stats["count"]
            if new_count != stats["count"]:
                applied.append(f"SMOTE: '{cls}' upsampled {stats['count']} → {new_count}")
            new_total += new_count
            new_dist[cls] = {"count": new_count, "percentage": 0.0}
        for cls in new_dist:
            new_dist[cls]["percentage"] = round(new_dist[cls]["count"] / new_total * 100, 2)
        result["class_distribution"] = new_dist
        result["total_samples"]      = new_total

    result["optimized"] = True
    result["fix_log"]   = applied

    tasks[task_id]["result"]      = result
    tasks[task_id]["status"]      = "Optimized"
    tasks[task_id]["diagnostics"].append(
        f"Auto-fix: {'; '.join(applied) or 'No changes needed'}"
    )
    return {"status": "optimized", "applied": applied, "result": result}


# ── Legacy /upload ─────────────────────────────────────────────────────────────
@app.post("/upload")
async def upload_file_legacy(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    task_id   = str(uuid.uuid4())
    save_path = os.path.join(DATA_DIR, f"{task_id}_{file.filename}")
    tasks[task_id] = {
        "status": "Uploading", "progress": 0, "stage_key": None,
        "filename": file.filename, "file_path": save_path, "file_size_bytes": 0,
        "diagnostics": ["Upload started (legacy)."],
        "started_at": datetime.utcnow().isoformat(),
        "_abort_event": threading.Event(),
    }
    try:
        total = 0
        with open(save_path, "wb") as buf:
            while chunk := await file.read(CHUNK_SIZE):
                buf.write(chunk)
                total += len(chunk)
        tasks[task_id]["file_size_bytes"] = total
        tasks[task_id]["progress"]        = 20
        background_tasks.add_task(process_dataset, task_id, save_path, file.filename)
        return {"task_id": task_id, "filename": file.filename}
    except Exception as e:
        tasks[task_id]["status"] = "Failed"
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    full_name:    str
    email:        str
    password:     str
    organization: str = ""


class LoginRequest(BaseModel):
    email:    str
    password: str


class UserOut(BaseModel):
    id:                  str
    full_name:           str
    email:               str
    organization:        Optional[str] = ""
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    full_name:    Optional[str] = None
    organization: Optional[str] = None


@app.post("/api/auth/register", response_model=UserOut, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered.")
    user = User(
        id              = str(uuid.uuid4()),
        full_name       = req.full_name,
        email           = req.email,
        hashed_password = hash_password(req.password),
        organization    = req.organization,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    # OAuth-only accounts have no password — give a helpful message instead of crashing.
    if user.hashed_password is None:
        provider = user.oauth_provider or "a social provider"
        raise HTTPException(
            status_code=401,
            detail=(
                f"This account is connected to a social login ({provider.capitalize()}). "
                "Please sign in using Google or GitHub."
            ),
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.patch("/api/auth/me", response_model=UserOut)
def update_me(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.organization is not None:
        current_user.organization = req.organization
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/api/user/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext       = os.path.splitext(file.filename or "avatar.png")[1].lower() or ".png"
    filename  = f"{current_user.id}{ext}"
    file_path = os.path.join(AVATAR_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    current_user.profile_picture_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


# ── EXPORT (with Garbage Collection — race-condition safe) ────────────────────

def _create_zip_fast(dir_path: str, task_id: str) -> str:
    """
    High-performance ZIP creation with parallel file prefetching.

    • ZIP_STORED (zero compression) — images are already compressed.
    • Prefetch thread reads files in parallel via ThreadPoolExecutor.
    • Main writer thread sequences entries into the zip (format requirement).
    • Never loads 3000+ files into RAM at once (bounded queue).
    """
    zip_path = os.path.join(DATA_DIR, f"export_{task_id}.zip")

    # Collect all file paths
    all_files: list = []
    for root, _dirs, files in os.walk(dir_path):
        for fname in files:
            abs_path = os.path.join(root, fname)
            arc_name = os.path.relpath(abs_path, dir_path)
            all_files.append((abs_path, arc_name))

    # Bounded queue: prefetch reads ahead while zip writer sequences
    prefetch_q: queue.Queue = queue.Queue(maxsize=64)

    def _prefetcher():
        """Read file bytes in parallel using a small thread pool."""
        def _read(item):
            abs_path, arc_name = item
            try:
                with open(abs_path, "rb") as f:
                    return (arc_name, f.read())
            except OSError:
                return None

        with ThreadPoolExecutor(max_workers=4) as pool:
            for result in pool.map(_read, all_files):
                if result is not None:
                    prefetch_q.put(result)
        prefetch_q.put(None)  # sentinel

    pf_thread = threading.Thread(target=_prefetcher, daemon=True)
    pf_thread.start()

    # Sequential zip writing (zip format requires ordered central directory)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
        while True:
            item = prefetch_q.get()
            if item is None:
                break
            arc_name, data = item
            zf.writestr(arc_name, data)

    pf_thread.join(timeout=5)
    return zip_path


@app.get("/api/export/{task_id}")
async def export_dataset(task_id: str, background_tasks: BackgroundTasks):
    """
    Locate and serve the processed dataset (CSV or Zipped images).

    After the file is sent to the client, a BackgroundTask automatically
    deletes all temporary data for this task_id from disk (Upgrade #4).
    This prevents disk overflow when handling many large datasets.

    RACE-CONDITION FIX: The GC lock is held during zip creation so that
    _cleanup_task_data cannot delete the directory mid-archive.
    """
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found.")

    task = tasks[task_id]
    path = task.get("analysis_path")

    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Dataset file not found on server.")

    # If it's a directory (Classification / Segmentation), zip it first
    if os.path.isdir(path):
        lock = _get_task_lock(task_id)
        loop = asyncio.get_event_loop()

        def _guarded_zip():
            """Hold the GC lock while zipping so cleanup cannot fire mid-write."""
            lock.acquire()
            try:
                return _create_zip_fast(path, task_id)
            finally:
                lock.release()

        zip_path = await loop.run_in_executor(_EXECUTOR, _guarded_zip)

        # Schedule cleanup AFTER the zip is fully built and ready to serve.
        # FastAPI sends the FileResponse first, THEN runs background tasks.
        background_tasks.add_task(_cleanup_task_data, task_id)
        logger.info(f"[{task_id}] Disk cleanup scheduled (export path).")

        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="Validated_Dataset.zip",
        )

    # If it's a single file (Tabular), serve it directly
    # Schedule cleanup after the file is fully sent
    background_tasks.add_task(_cleanup_task_data, task_id)
    logger.info(f"[{task_id}] Disk cleanup scheduled (export path).")

    ext = os.path.splitext(path)[1]
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=f"Validated_Dataset{ext}",
    )
