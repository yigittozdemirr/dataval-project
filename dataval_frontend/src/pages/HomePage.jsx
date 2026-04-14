import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, XCircle, FileText, X, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';
import NavBar from '../components/NavBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { stageFile, startAnalysis } from '../lib/api.js';
import { readSettings } from './SettingsPage.jsx';

const REQUIREMENTS = [
    { ok: true, label: 'Supported Formats', sub: 'CSV, JSON, Parquet, or ZIP containing images.' },
    { ok: true, label: 'Structure', sub: 'Tabular data must include headers in the first row.' },
    { ok: true, label: 'Encoding', sub: 'UTF-8 encoding is strictly required for text fields.' },
    { ok: false, label: 'Restrictions', sub: 'Encrypted archives and executable files are automatically rejected.' },
];

const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const HomePage = () => {
    const navigate = useNavigate();
    const { setStagedFile, setTaskId } = useApp();

    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);        // raw File object
    const [stagingState, setStagingState] = useState('idle');      // idle | staging | staged | error
    const [uploadPct, setUploadPct] = useState(0);
    const [uploadedBytes, setUploadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);
    const [stagedTaskId, setStagedTaskId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileRef = useRef(null);
    const abortRef = useRef(null);

    /* ── Stage the file (upload only, no analysis) ── */
    const handleFile = async (file) => {
        if (!file) return;

        // Validate max file size from settings
        const settings = readSettings();
        const maxBytes = (settings.maxFileSizeMB || 500) * 1024 * 1024;
        if (file.size > maxBytes) {
            setErrorMsg(`File exceeds maximum size (${settings.maxFileSizeMB} MB). Change this limit in Settings.`);
            setStagingState('error');
            return;
        }

        setSelectedFile(file);
        setTotalBytes(file.size);
        setStagingState('staging');
        setUploadPct(0);
        setUploadedBytes(0);
        setErrorMsg('');

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            const res = await stageFile(
                file,
                (pct, loaded) => { setUploadPct(pct); setUploadedBytes(loaded); },
                ctrl.signal
            );
            const { task_id } = res.data;
            setStagedTaskId(task_id);
            setStagedFile({ name: file.name, size: file.size, taskId: task_id });
            setTaskId(task_id);
            setStagingState('staged');
        } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
            setErrorMsg('Staging failed. Ensure the backend is running at :8000.');
            setStagingState('error');
        }
    };

    /* ── Kick off analysis ── */
    const handleAnalyze = async () => {
        if (!stagedTaskId) return;
        setIsAnalyzing(true);
        try {
            const settings = readSettings();
            await startAnalysis(stagedTaskId, settings);
            navigate('/analyzing');
        } catch {
            setErrorMsg('Failed to start analysis. Please try again.');
            setIsAnalyzing(false);
        }
    };

    const resetFile = () => {
        abortRef.current?.abort();
        setSelectedFile(null);
        setStagingState('idle');
        setStagedTaskId(null);
        setUploadPct(0);
        setErrorMsg('');
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const canAnalyze = stagingState === 'staged' && !isAnalyzing;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14' }}>
            <NavBar />

            <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-5xl"
                >
                    <h1 className="text-4xl font-bold text-white text-center mb-3 tracking-tight">
                        Upload Your Dataset
                    </h1>
                    <p className="text-white/40 text-center mb-12 max-w-lg mx-auto leading-relaxed text-sm">
                        Run leakage tests, EDA, and class distribution analysis in seconds.
                        We support complex data structures and large archives.
                    </p>

                    <div className="grid grid-cols-5 gap-6">
                        {/* ── Drop Zone ── */}
                        <div className="col-span-3">
                            <div
                                className="relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden"
                                style={{
                                    background: '#252520',
                                    borderColor: isDragging ? '#D4F03D' : '#3a3a30',
                                    boxShadow: isDragging ? '0 0 40px rgba(212,240,61,0.15)' : 'none',
                                }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                            >
                                {/* Format pills */}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {['.CSV', '.JSON', '.ZIP'].map(f => (
                                        <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded text-white/50"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {f}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                                    <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center"
                                        style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.2)' }}>
                                        <Upload className="w-8 h-8" style={{ color: '#D4F03D' }} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Drag &amp; Drop files here</h3>
                                    <p className="text-white/30 text-sm mb-8">or click to browse from your computer</p>
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        disabled={stagingState === 'staging'}
                                        className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                                        style={{ background: 'rgba(212,240,61,0.15)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.3)' }}
                                    >
                                        Browse Files
                                    </button>
                                    <p className="text-white/20 text-xs mt-6">Maximum file size: {readSettings().maxFileSizeMB} MB</p>
                                </div>

                                <input
                                    type="file"
                                    ref={fileRef}
                                    className="hidden"
                                    onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                                    accept=".csv,.json,.parquet,.zip,.pqt"
                                />
                            </div>

                            {/* ── Progress / Staged card ── */}
                            <AnimatePresence>
                                {selectedFile && stagingState !== 'idle' && (
                                    <motion.div
                                        key="progress"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="mt-4 rounded-2xl p-5"
                                        style={{ background: '#252520' }}
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(212,240,61,0.1)' }}>
                                                <FileText className="w-5 h-5" style={{ color: '#D4F03D' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-white text-sm truncate">{selectedFile.name}</p>
                                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                    {stagingState === 'staging'
                                                        ? 'Uploading to server...'
                                                        : stagingState === 'staged'
                                                            ? '✓ Ready to analyze'
                                                            : 'Upload failed'}
                                                </p>
                                            </div>
                                            <button onClick={resetFile} className="text-white/20 hover:text-white/60 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {stagingState === 'staging' && (
                                            <>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-semibold text-lg" style={{ color: '#D4F03D' }}>
                                                        {uploadPct}%
                                                    </span>
                                                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                        {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full overflow-hidden"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            background: 'linear-gradient(90deg, #D4F03D, #a8c430)',
                                                            boxShadow: '0 0 12px rgba(212,240,61,0.5)',
                                                        }}
                                                        animate={{ width: `${uploadPct}%` }}
                                                        transition={{ type: 'spring', damping: 20 }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {stagingState === 'staged' && (
                                            <div className="flex items-center gap-2 text-sm" style={{ color: '#D4F03D' }}>
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="font-semibold">Staged — {formatBytes(totalBytes)}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {errorMsg && (
                                <div className="mt-4 p-4 rounded-xl border text-sm text-red-400"
                                    style={{ background: 'rgba(255,61,0,0.08)', borderColor: 'rgba(255,61,0,0.3)' }}>
                                    {errorMsg}
                                </div>
                            )}
                        </div>

                        {/* ── Right Column ── */}
                        <div className="col-span-2 flex flex-col gap-4">
                            {/* Requirements card */}
                            <div className="rounded-2xl p-6 flex-1" style={{ background: '#252520' }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                        style={{ background: 'rgba(212,240,61,0.15)' }}>
                                        <Shield className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                    </div>
                                    <h3 className="font-bold text-white">Upload Requirements</h3>
                                </div>
                                <div className="space-y-5">
                                    {REQUIREMENTS.map((r, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="shrink-0 mt-0.5">
                                                {r.ok
                                                    ? <CheckCircle2 className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                                    : <XCircle className="w-4 h-4 text-red-400" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-white leading-tight">{r.label}</p>
                                                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                                    {r.sub}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pro tip */}
                            <div className="rounded-2xl p-5" style={{ background: '#252520' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#D4F03D' }}>
                                        Pro Tip
                                    </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Compress large CSV files into a .ZIP to reduce upload time by up to 50%.
                                </p>
                            </div>

                            {/* ── Analyze Dataset button ── */}
                            <motion.button
                                onClick={handleAnalyze}
                                disabled={!canAnalyze}
                                whileHover={canAnalyze ? { scale: 1.02 } : {}}
                                whileTap={canAnalyze ? { scale: 0.97 } : {}}
                                className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                style={canAnalyze
                                    ? { background: '#D4F03D', color: '#111', boxShadow: '0 0 20px rgba(212,240,61,0.3)' }
                                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}
                            >
                                {isAnalyzing
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting Analysis...</>
                                    : stagingState === 'staging'
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                        : <><span>Analyze Dataset</span><ArrowRight className="w-4 h-4" /></>}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </main>

            <footer className="text-center py-6 text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
                © 2026 Dataset Validator Inc. · Secure Enclave Processing
            </footer>
        </div>
    );
};

export default HomePage;
