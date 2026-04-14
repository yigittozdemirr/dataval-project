import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Cpu, Gauge, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import NavBar from '../components/NavBar.jsx';
import RadarAnimation from '../components/RadarAnimation.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { getStatus, abortAnalysis, deleteTask } from '../lib/api.js';
import { readSettings } from './SettingsPage.jsx';

const STAGES = [
    { key: 'integrity', label: 'Checking file integrity', sub: 'SHA-256 verification' },
    { key: 'types', label: 'Detecting data types', sub: 'Scanning schema...' },
    { key: 'distribution', label: 'Analyzing class distribution', sub: 'Counting classes...' },
    { key: 'leakage', label: 'Running leakage tests', sub: 'Waiting for queue...' },
    { key: 'report', label: 'Generating EDA report', sub: 'Final step' },
];

/* Backend stage_key → index in STAGES array */
const STAGE_KEY_TO_IDX = {
    integrity: 0, types: 1, distribution: 2, leakage: 3, report: 4,
};

/* Fallback: map progress 0-100 → completed count */
const progressToCompleted = (p) => {
    if (p < 20) return 0;
    if (p < 40) return 1;
    if (p < 60) return 2;
    if (p < 80) return 3;
    if (p < 100) return 4;
    return 5;
};

const formatBytes = (b) => {
    if (!b) return '—';
    return b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${(b / 1024).toFixed(1)} KB`;
};

const AnalyzingPage = () => {
    const navigate = useNavigate();
    const { taskId, stagedFile, setAnalysisResult } = useApp();

    const [progress, setProgress] = useState(0);
    const [stageKey, setStageKey] = useState(null);   // from backend
    const [diagnostics, setDiagnostics] = useState([]);
    const [eta, setEta] = useState(null);
    const [speed, setSpeed] = useState(null);
    const [memUsage, setMemUsage] = useState(null);
    const [fileSizeB, setFileSizeB] = useState(stagedFile?.size || 0);
    const [error, setError] = useState(null);
    const [aborting, setAborting] = useState(false);

    const startTimeRef = useRef(Date.now());
    const pollRef = useRef(null);
    // ⚠️  REF not state — so interval closures always see the latest value instantly
    const isAbortedRef = useRef(false);

    /* ── ETA & speed — uses ref values so always fresh ── */
    const calcMetrics = useCallback((prog, sizeBytes) => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (prog > 0 && elapsed > 0.5 && sizeBytes > 0) {
            const remaining = Math.round((elapsed / prog) * (100 - prog));
            setEta(remaining);
            const processedMB = (prog / 100) * (sizeBytes / (1024 * 1024));
            setSpeed((processedMB / elapsed).toFixed(2));
        }
    }, []);

    /* ── Polling loop ── */
    useEffect(() => {
        if (!taskId) { navigate('/upload'); return; }

        const clearPoll = () => {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        };

        const poll = async () => {
            // Use the REF — never stale inside closures
            if (isAbortedRef.current) return;

            try {
                const res = await getStatus(taskId);
                if (isAbortedRef.current) return;   // check again after async

                const data = res.data;
                const prog = data.progress ?? 0;

                setProgress(prog);
                if (Array.isArray(data.diagnostics)) setDiagnostics(data.diagnostics);
                if (data.stage_key) setStageKey(data.stage_key);
                if (data.memory_mb) setMemUsage(data.memory_mb);

                // Resolve file size from status if context doesn't have it yet
                const sz = data.file_size_bytes || stagedFile?.size || fileSizeB;
                if (sz && sz !== fileSizeB) setFileSizeB(sz);
                calcMetrics(prog, sz || fileSizeB);

                if (data.status === 'Aborted') {
                    clearPoll();
                    return;
                }
                if (data.status === 'Completed') {
                    setAnalysisResult(data);
                    clearPoll();

                    // ── Settings-driven side effects on completion ──────────
                    const s = readSettings();

                    // 1. Success toast
                    if (s.analysisCompleteToast) {
                        toast.success('Analysis complete!', {
                            description: `${data.filename || 'Your dataset'} has been fully validated.`,
                            duration: 5000,
                        });
                    }

                    // 2. Critical issue alert (leakage)
                    const hasLeakage = (data.result?.leakage_risk_columns || []).length > 0;
                    if (s.criticalIssueAlerts && hasLeakage) {
                        toast.warning('Data leakage detected!', {
                            description: 'One or more columns have high correlation with the target. Review the Leakage Test panel.',
                            duration: 8000,
                        });
                    }

                    // 3. Purge task from backend history if user opted out
                    if (!s.storeHistoryLocally) {
                        try { await deleteTask(data.task_id); } catch { /* best-effort */ }
                    }

                    setTimeout(() => navigate('/dashboard'), 500);
                } else if (data.status === 'Failed') {
                    setError(data.error || 'Analysis failed unexpectedly.');
                    clearPoll();
                }
            } catch (e) {
                if (!isAbortedRef.current) console.error('Poll error:', e);
            }
        };

        startTimeRef.current = Date.now();
        isAbortedRef.current = false;
        poll();
        pollRef.current = setInterval(poll, 900);
        return clearPoll;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    /* ── TRUE KILL Abort ── */
    const handleAbort = async () => {
        if (aborting) return;
        setAborting(true);

        // 1. Flip ref FIRST — any in-flight poll callback will see this immediately
        isAbortedRef.current = true;

        // 2. Stop the interval
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

        // 3. Tell backend to kill the task
        try { await abortAnalysis(taskId); } catch { /* best-effort */ }

        // 4. Navigate to upload (not landing) after abort
        navigate('/upload');
    };

    /* ── Go to Docs, passing context so Docs can show abort/continue buttons ── */
    const goToDocs = () => navigate('/docs', { state: { fromAnalyzing: true, taskId } });

    /* ── Stage computation ── */
    const completedCount = stageKey != null
        ? (STAGE_KEY_TO_IDX[stageKey] ?? progressToCompleted(progress))
        : progressToCompleted(progress);
    const activeIdx = completedCount < 5 ? completedCount : -1;

    const lastDiag = diagnostics[diagnostics.length - 1] || 'Initializing...';

    const etaLabel = eta !== null
        ? eta < 60 ? `~${eta}s remaining` : `~${Math.round(eta / 60)}m remaining`
        : 'Calculating...';

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: 'white' }}>
            <NavBar />

            {/* ── Page Header ── */}
            <div className="px-10 pt-8 pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest"
                                style={{ background: 'rgba(212,240,61,0.15)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.25)' }}>
                                v2.4.0 Running
                            </span>
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Task ID: #{taskId?.slice(-8).toUpperCase() || '—'}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-white mb-1">Analyzing Dataset</h1>
                        <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{stagedFile?.name || 'dataset'}</span>
                            <span>·</span>
                            <span>{formatBytes(fileSizeB || stagedFile?.size)}</span>
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Overall Progress</p>
                        <div className="flex items-center gap-4 justify-end">
                            <div className="w-56 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <motion.div className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg,#D4F03D,#a8c430)', boxShadow: '0 0 10px rgba(212,240,61,0.5)' }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: 'spring', damping: 25 }}
                                />
                            </div>
                            <span className="text-2xl font-black" style={{ color: '#D4F03D' }}>{progress}%</span>
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: '#D4F03D' }}>EST: {etaLabel}</p>
                    </div>
                </div>
            </div>

            {/* ── Main Grid ── */}
            <div className="flex-1 grid grid-cols-2 gap-6 px-10 pt-4 pb-6">

                {/* Left: Radar + bottom metrics */}
                <div className="flex flex-col gap-4">
                    {/* overflow-hidden clips the scaled pulse rings to this card boundary */}
                    <div className="rounded-2xl border p-6 flex-1 overflow-hidden"
                        style={{ background: '#1e1e18', borderColor: 'rgba(255,255,255,0.07)' }}>
                        <RadarAnimation status={lastDiag} engineBars={aborting ? 0 : 3} />
                    </div>

                    {/* Memory + Speed cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl p-5 border" style={{ background: '#1e1e18', borderColor: 'rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Cpu className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    Memory Usage
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-white">{memUsage ? `${memUsage} MB` : '—'}</p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>process RAM</p>
                        </div>
                        <div className="rounded-xl p-5 border" style={{ background: '#1e1e18', borderColor: 'rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Gauge className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    Processing Speed
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-white">{speed ? `${speed}` : '—'}</p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>MB/s throughput</p>
                        </div>
                    </div>
                </div>

                {/* Right: System Diagnostics + abort */}
                <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border p-6 flex-1" style={{ background: '#1e1e18', borderColor: 'rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-white text-lg">System Diagnostics</h2>
                            <button className="text-xs font-semibold px-3 py-1 rounded-md transition-all hover:text-white"
                                style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                VIEW LOG
                            </button>
                        </div>

                        <div className="space-y-3">
                            {STAGES.map((stage, idx) => {
                                const isDone = idx < completedCount;
                                const isActive = idx === activeIdx;

                                return (
                                    <motion.div key={stage.key}
                                        className="flex items-center gap-4 p-4 rounded-xl border transition-all"
                                        style={{
                                            background: isActive
                                                ? 'rgba(212,240,61,0.05)'
                                                : isDone ? 'rgba(255,255,255,0.02)' : 'transparent',
                                            borderColor: isActive
                                                ? 'rgba(212,240,61,0.2)'
                                                : isDone ? 'rgba(212,240,61,0.1)' : 'rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                            style={{
                                                background: isDone ? 'rgba(212,240,61,0.15)' : isActive ? 'rgba(212,240,61,0.1)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${isDone ? 'rgba(212,240,61,0.3)' : isActive ? 'rgba(212,240,61,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                            }}>
                                            {isDone ? (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                    stroke="#D4F03D" strokeWidth="2.5" strokeLinecap="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            ) : isActive ? (
                                                <motion.div className="w-3 h-3 rounded-full"
                                                    style={{ background: '#D4F03D' }}
                                                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                                    transition={{ duration: 1.2, repeat: Infinity }}
                                                />
                                            ) : (
                                                <div className="w-3 h-3 rounded-full"
                                                    style={{ background: 'rgba(255,255,255,0.12)' }} />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <p className="text-sm font-semibold" style={{
                                                color: isDone ? 'rgba(255,255,255,0.7)' : isActive ? 'white' : 'rgba(255,255,255,0.3)'
                                            }}>
                                                {stage.label}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{
                                                color: isDone ? 'rgba(212,240,61,0.6)' : isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'
                                            }}>
                                                {isDone ? 'Completed' : isActive ? lastDiag : stage.sub}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center gap-3 p-4 rounded-xl border"
                                style={{ background: 'rgba(255,61,0,0.08)', borderColor: 'rgba(255,61,0,0.25)' }}>
                                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                                <p className="text-sm text-red-300">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Abort button */}
                    <button
                        onClick={handleAbort}
                        disabled={aborting}
                        className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95 border disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(255,61,0,0.08)', color: '#FF6B6B', borderColor: 'rgba(255,61,0,0.2)' }}
                    >
                        <XCircle className="w-5 h-5" />
                        {aborting ? 'ABORTING...' : 'ABORT ANALYSIS'}
                    </button>
                </div>
            </div>

            {/* ── Log stream footer ── */}
            <div className="px-10 pb-6">
                <div className="rounded-xl px-5 py-3 border flex items-center gap-3"
                    style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-[10px] font-black uppercase tracking-widest shrink-0"
                        style={{ color: '#D4F03D' }}>→ LIVE STREAM</span>
                    <p className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {diagnostics[diagnostics.length - 1] || 'Waiting for log output...'}
                    </p>
                    <div className="ml-auto shrink-0">
                        <button
                            onClick={goToDocs}
                            className="text-xs hover:text-white transition-colors bg-transparent border-0 cursor-pointer p-0"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                            Need help? <span style={{ color: '#D4F03D' }}>Read Documentation</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyzingPage;
