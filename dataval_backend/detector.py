import os
import logging
from typing import List

logger = logging.getLogger("DataValBackend")

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")
TABULAR_EXTS = (".csv", ".json", ".parquet", ".pqt", ".xlsx")
SPLIT_NAMES = {"train", "test", "val", "valid", "validation"}
SEG_MASK_NAMES = {"masks", "mask", "labels", "label", "annotations", "annotation"}


def _has_images(dir_path: str) -> bool:
    """Return True if a directory directly contains at least one image file."""
    try:
        return any(
            f.lower().endswith(IMAGE_EXTS)
            for f in os.listdir(dir_path)
            if os.path.isfile(os.path.join(dir_path, f))
        )
    except OSError:
        return False


def _subdirs(dir_path: str) -> List[str]:
    """Return lowercase names of immediate subdirectories."""
    try:
        return [
            d.lower()
            for d in os.listdir(dir_path)
            if os.path.isdir(os.path.join(dir_path, d))
        ]
    except OSError:
        return []


def _subdir_paths(dir_path: str) -> List[str]:
    """Return absolute paths of immediate subdirectories."""
    try:
        return [
            os.path.join(dir_path, d)
            for d in os.listdir(dir_path)
            if os.path.isdir(os.path.join(dir_path, d))
        ]
    except OSError:
        return []


def detect_dataset_type(base_path: str) -> str:
    """
    Recursively detects the dataset type at any folder depth.

    Detection priority:
      1. Single tabular file (csv/json/parquet/xlsx)
      2. Segmentation: any dir that contains both an 'images' subdir and a
         masks/labels subdir (checked at every level via os.walk)
      3. Classification:
         a. Any standard split dir (train/test/val) that contains class subfolders
            with images inside them.
         b. Any dir with ≥2 subdirs that each directly contain images (flat layout).
      4. Tabular file found anywhere in the tree
      5. Unknown — safe fallback, never raises
    """
    if not os.path.exists(base_path):
        logger.warning(f"detect_dataset_type: path does not exist: {base_path}")
        return "Unknown"

    # ── 1. Single file ────────────────────────────────────────────────────────
    if not os.path.isdir(base_path):
        ext = os.path.splitext(base_path)[1].lower()
        if ext in TABULAR_EXTS:
            return "Tabular Data"
        return "Unknown"

    found_tabular_anywhere = False

    # ── Walk the entire tree once ─────────────────────────────────────────────
    for root, dirs, files in os.walk(base_path):
        dirs_lower = {d.lower() for d in dirs}

        # ── 2. Segmentation detection ────────────────────────────────────────
        # Require an 'images' folder alongside any mask/label folder
        if "images" in dirs_lower:
            if dirs_lower & SEG_MASK_NAMES:
                logger.info(f"Segmentation detected at: {root}")
                return "Segmentation"

        # ── 3a. Standard split directories ───────────────────────────────────
        split_dirs_found = dirs_lower & SPLIT_NAMES
        if split_dirs_found:
            for split_name in split_dirs_found:
                # Find the actual (case-correct) folder name
                actual = next(d for d in dirs if d.lower() == split_name)
                split_path = os.path.join(root, actual)
                class_dirs = _subdir_paths(split_path)
                # Class dirs must themselves contain images
                image_class_count = sum(1 for cd in class_dirs if _has_images(cd))
                if image_class_count >= 1:
                    logger.info(f"Classification (split layout) detected at: {split_path}")
                    return "Classification"

        # ── 3b. Flat classification (class folders side by side) ─────────────
        sub_paths = _subdir_paths(root)
        # Don't mis-classify split-level folders themselves as class dirs
        non_split_subs = [
            p for p in sub_paths
            if os.path.basename(p).lower() not in SPLIT_NAMES
        ]
        image_dirs = [p for p in non_split_subs if _has_images(p)]
        if len(image_dirs) >= 2:
            logger.info(f"Classification (flat layout) detected at: {root}")
            return "Classification"

        # ── Tabular file anywhere in tree ─────────────────────────────────────
        for f in files:
            if f.lower().endswith(TABULAR_EXTS):
                found_tabular_anywhere = True

    if found_tabular_anywhere:
        logger.info(f"Tabular data detected inside: {base_path}")
        return "Tabular Data"

    logger.warning(f"Could not detect dataset type for: {base_path}")
    return "Unknown"


def get_tabular_files(base_path: str) -> List[str]:
    """Return all tabular files found at any depth under base_path."""
    if os.path.isfile(base_path):
        return [base_path] if base_path.lower().endswith(TABULAR_EXTS) else []

    tabular_files = []
    for root, _, filenames in os.walk(base_path):
        for f in filenames:
            if f.lower().endswith(TABULAR_EXTS):
                tabular_files.append(os.path.join(root, f))
    return tabular_files
