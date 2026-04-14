import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Book, Zap, Shield, Database, Code, Play, XCircle, FileText } from 'lucide-react';
import NavBar from '../components/NavBar.jsx';
import { abortAnalysis } from '../lib/api.js';

const SECTIONS = [
    {
        icon: Book, title: 'Getting Started & Dataset Detection',
        content: `DataValidator accepts CSV, JSON, Parquet, or ZIP files containing images. Upload your file on the home page, then click "Analyze Dataset" to begin.\nThe system automatically detects whether your dataset is Tabular, Classification, or Segmentation based on its structure.`
    },
    {
        icon: Database, title: 'Exploratory Data Analysis (EDA)',
        content: `DataValidator automatically performs comprehensive EDA:\n• Missing Value Analysis (MCAR / MAR / MNAR patterns)\n• Class Distribution computation\n• Duplicate row/image and corrupt file flagging\n• Detailed summary statistics for tabular features or image resolutions.`
    },
    {
        icon: Shield, title: 'Leakage Risk Detection',
        content: `Target leakage prevents your model from generalizing. DataValidator flags:\n• High-correlation columns (Pearson |r| > 0.95 with the target)\n• Potential ID/key columns (high unique-value ratio)\n• For images: Label leaks in filenames and cross-split duplicate images (checked via MD5 hashing).`
    },
    {
        icon: Zap, title: 'Auto-Fix & Augmentations',
        content: `Use the Auto-Fix button to automatically drop leakage columns and balance sparse classes.\nAugmentations run directly on the backend and update your dataset in-place:\n• Tabular: SMOTE Upsampling, Gaussian Noise, Shuffle Rows.\n• Vision: Horizontal Flip, Random Rotation, Color Jitter, Elastic Deformation, Random Crop, Grid Distortion.`
    },
    {
        icon: FileText, title: 'PDF Reporting',
        content: `Export a clean, fully-vectorized PDF report directly from the Dashboard. The PDF includes all EDA charts, leakage scores, quality checks, and augmentation recommendations, ready to share with your ML engineering team.`
    },
    {
        icon: Code, title: 'Deployment Configs & API Reference',
        content: `DataValidator provides a fully decoupled REST API powered by FastAPI:\nPOST /stage - Upload & stage\nPOST /analyze/{id} - Start background analysis\nGET /status/{id} - Poll progress\nPOST /augment-apply/{id} - Transform data\nGET /api/export/{id} - Download final dataset\nDeploy easily via standard ASGI servers.`
    },
];

const AccordionItem = ({ icon: Icon, title, content }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-xl border overflow-hidden mb-3 transition-all"
            style={{ background: '#252520', borderColor: open ? 'rgba(212,240,61,0.2)' : 'rgba(255,255,255,0.07)' }}>
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 p-5 text-left transition-all hover:bg-white/5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: open ? 'rgba(212,240,61,0.15)' : 'rgba(255,255,255,0.06)' }}>
                    <Icon className="w-4 h-4" style={{ color: open ? '#D4F03D' : 'rgba(255,255,255,0.4)' }} />
                </div>
                <span className="flex-1 font-semibold text-sm text-white">{title}</span>
                {open
                    ? <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    : <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            </button>
            {open && (
                <div className="px-5 pb-5">
                    <div className="h-px w-full mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
                        style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {content}
                    </pre>
                </div>
            )}
        </div>
    );
};

const DocsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state || {};
    const fromAnalyzing = state.fromAnalyzing === true;
    const taskId = state.taskId || null;

    const [aborting, setAborting] = useState(false);
    const [toast, setToast] = useState(null);

    const handleContinue = () => navigate('/analyzing');

    const handleAbort = async () => {
        if (aborting || !taskId) return;
        setAborting(true);
        try {
            await abortAnalysis(taskId);
            setToast('Analysis aborted successfully.');
            setTimeout(() => navigate('/upload'), 1200);
        } catch {
            setToast('Abort request sent.');
            setTimeout(() => navigate('/upload'), 1200);
        }
    };

    return (
        /* Extra bottom padding so content isn't hidden behind fixed bar */
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: 'white', paddingBottom: fromAnalyzing ? 80 : 0 }}>
            <NavBar />
            <main className="flex-1 px-10 py-10 max-w-3xl w-full mx-auto">
                {fromAnalyzing && (
                    <div className="flex items-center gap-3 mb-8 px-4 py-3 rounded-xl border"
                        style={{ background: 'rgba(212,240,61,0.05)', borderColor: 'rgba(212,240,61,0.15)' }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4F03D' }} />
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Your analysis is still running in the background.
                            <span style={{ color: '#D4F03D' }}> Task: #{taskId?.slice(-8).toUpperCase() || '—'}</span>
                        </p>
                    </div>
                )}

                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(212,240,61,0.12)' }}>
                            <Book className="w-5 h-5" style={{ color: '#D4F03D' }} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Everything you need to know about DataValidator's analysis pipeline, endpoints, and features.
                    </p>
                </div>

                {SECTIONS.map((s, i) => <AccordionItem key={i} {...s} />)}
            </main>

            {/* ── Context bar — only when coming from /analyzing ── */}
            <AnimatePresence>
                {fromAnalyzing && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-4 px-10 py-4 border-t"
                        style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                        <div className="flex items-center gap-2 flex-1">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4F03D' }} />
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Analysis in progress — task #{taskId?.slice(-8).toUpperCase() || '—'}
                            </span>
                        </div>

                        <button
                            onClick={handleContinue}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:brightness-105 active:scale-95"
                            style={{ background: '#D4F03D' }}
                        >
                            <Play className="w-4 h-4" />
                            Continue Analysis
                        </button>

                        <button
                            onClick={handleAbort}
                            disabled={aborting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95 border disabled:opacity-50"
                            style={{ background: 'rgba(255,61,0,0.08)', color: '#FF6B6B', borderColor: 'rgba(255,61,0,0.25)' }}
                        >
                            <XCircle className="w-4 h-4" />
                            {aborting ? 'Aborting...' : 'Abort Analysis'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl z-50 text-sm font-semibold"
                        style={{ background: '#D4F03D', color: '#000' }}
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DocsPage;
