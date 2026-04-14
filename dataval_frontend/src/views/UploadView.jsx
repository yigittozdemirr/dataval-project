import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, XCircle, FileText, X, Zap, Shield, Database, Globe } from 'lucide-react';

const API_BASE = "http://localhost:8000";

const REQUIREMENTS = [
    { ok: true, label: "Supported Formats", sub: "CSV, JSON, Parquet, or ZIP containing images." },
    { ok: true, label: "Structure", sub: "Tabular data must include headers in the first row." },
    { ok: true, label: "Encoding", sub: "UTF-8 encoding is strictly required for text fields." },
    { ok: false, label: "Restrictions", sub: "Encrypted archives and executable files are automatically rejected." },
];

const UploadView = ({ onUploadStart }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedMB, setUploadedMB] = useState(0);
    const [totalMB, setTotalMB] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const fileRef = useRef(null);

    const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

    const startUpload = (file) => {
        setSelectedFile(file);
        setIsUploading(true);
        setProgress(0);
        setErrorMsg('');
        const total = file.size;
        setTotalMB(formatMB(total));

        const formData = new FormData();
        formData.append('file', file);
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                setProgress(Math.round((e.loaded / e.total) * 100));
                setUploadedMB(formatMB(e.loaded));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.response);
                setProgress(100);
                setTimeout(() => onUploadStart(data.task_id), 600);
            } else {
                setErrorMsg("Upload failed. Check backend connection.");
                setIsUploading(false);
            }
        };

        xhr.onerror = () => {
            setErrorMsg("Network error. Ensure backend is running at :8000.");
            setIsUploading(false);
        };

        xhr.open('POST', `${API_BASE}/upload`);
        xhr.send(formData);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) startUpload(file);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14' }}>
            {/* Top Nav */}
            <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4F03D' }}>
                        <div className="grid grid-cols-2 gap-0.5">
                            {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
                        </div>
                    </div>
                    <span className="font-bold text-white text-lg tracking-tight">DataVal.ai</span>
                </div>
                <div className="flex items-center gap-8">
                    {['Dashboard', 'History', 'Settings'].map(n => (
                        <a key={n} href="#" className="text-sm text-white/40 hover:text-white/80 transition-colors">{n}</a>
                    ))}
                    <button className="px-4 py-2 rounded-lg font-semibold text-sm text-black" style={{ background: '#D4F03D' }}>
                        Documentation
                    </button>
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">U</div>
                </div>
            </nav>

            {/* Main */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
                <h1 className="text-4xl font-bold text-white text-center mb-3 tracking-tight">Upload Your Dataset</h1>
                <p className="text-white/40 text-center mb-12 max-w-lg leading-relaxed text-sm">
                    Run leakage tests, EDA, and class distribution analysis in seconds. We support complex data structures and large archives.
                </p>

                <div className="w-full max-w-5xl grid grid-cols-5 gap-6">
                    {/* Drop Zone */}
                    <div className="col-span-3">
                        <div
                            className="relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden"
                            style={{
                                background: '#252520',
                                borderColor: isDragging ? '#D4F03D' : '#3a3a30',
                                boxShadow: isDragging ? '0 0 40px rgba(212,240,61,0.15)' : 'none'
                            }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={onDrop}
                        >
                            {/* Format pills */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                {['.CSV', '.JSON', '.ZIP'].map(f => (
                                    <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded text-white/50"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>{f}</span>
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
                                    onClick={() => fileRef.current.click()}
                                    className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-95"
                                    style={{ background: 'rgba(212,240,61,0.15)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.3)' }}>
                                    Browse Files
                                </button>
                                <p className="text-white/20 text-xs mt-6">Maximum file size: 10GB</p>
                            </div>
                            <input type="file" ref={fileRef} className="hidden" onChange={(e) => e.target.files[0] && startUpload(e.target.files[0])} />
                        </div>

                        {/* Upload progress bar */}
                        <AnimatePresence>
                            {isUploading && selectedFile && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 rounded-2xl p-5" style={{ background: '#252520' }}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(212,240,61,0.1)' }}>
                                            <FileText className="w-5 h-5" style={{ color: '#D4F03D' }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white text-sm truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-white/30">Uploading...</p>
                                        </div>
                                        <button onClick={() => { setIsUploading(false); setSelectedFile(null); }}
                                            className="text-white/20 hover:text-white/60 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-white/40 mb-3">
                                        <span className="font-semibold text-lg" style={{ color: '#D4F03D' }}>{progress}%</span>
                                        <span>{uploadedMB} MB / {totalMB} MB</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{
                                                background: 'linear-gradient(90deg, #D4F03D, #a8c430)',
                                                boxShadow: '0 0 12px rgba(212,240,61,0.6)',
                                            }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ type: 'spring', damping: 20 }}
                                        />
                                    </div>
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

                    {/* Requirements card */}
                    <div className="col-span-2 flex flex-col gap-4">
                        <div className="rounded-2xl p-6 flex-1" style={{ background: '#252520' }}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,240,61,0.15)' }}>
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
                                                : <XCircle className="w-4 h-4 text-red-400" />
                                            }
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-white leading-tight">{r.label}</p>
                                            <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{r.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pro tip */}
                        <div className="rounded-2xl p-5" style={{ background: '#252520' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#D4F03D' }}>Pro Tip</span>
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed">
                                Compress large CSV files into a .ZIP to reduce upload time by up to 50%.
                            </p>
                        </div>

                        {/* Analyze button */}
                        <button
                            disabled={!isUploading && !selectedFile}
                            className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                            style={isUploading || selectedFile
                                ? { background: '#D4F03D', color: '#111' }
                                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }
                            }>
                            Analyze Dataset →
                        </button>
                    </div>
                </div>
            </main>

            <footer className="text-center py-6 text-xs text-white/15">
                © 2026 Dataset Validator Inc. Secure Enclave Processing.
            </footer>
        </div>
    );
};

export default UploadView;
