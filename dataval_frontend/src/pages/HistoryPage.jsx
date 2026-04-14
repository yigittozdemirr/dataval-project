import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, Database, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import NavBar from '../components/NavBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { getHistory } from '../lib/api.js';

const HistoryPage = () => {
    const navigate = useNavigate();
    const { setAnalysisResult, setTaskId } = useApp();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getHistory();
                setHistory(res.data || []);
            } catch {
                setError('Could not load history. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const reopenResult = (entry) => {
        setTaskId(entry.task_id);
        setAnalysisResult(entry);
        navigate('/dashboard');
    };

    const typeColor = (t) => {
        if (t === 'Classification') return { color: '#D4F03D', bg: 'rgba(212,240,61,0.1)' };
        if (t === 'Segmentation') return { color: '#00E0FF', bg: 'rgba(0,224,255,0.1)' };
        return { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' };
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: 'white' }}>
            <NavBar />

            <main className="flex-1 px-10 py-10 max-w-5xl w-full mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            All past dataset analyses from this session
                        </p>
                    </div>
                    <Link to="/upload" className="px-4 py-2.5 rounded-xl font-bold text-sm text-black"
                        style={{ background: '#D4F03D' }}>
                        + New Analysis
                    </Link>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#D4F03D' }} />
                    </div>
                )}

                {error && (
                    <div className="p-5 rounded-xl border flex items-center gap-3"
                        style={{ background: 'rgba(255,61,0,0.08)', borderColor: 'rgba(255,61,0,0.2)' }}>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                {!loading && !error && history.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Database className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
                        <p className="font-semibold text-white/40">No past analyses found</p>
                        <p className="text-sm mt-2 text-white/25">Upload a dataset to get started</p>
                    </div>
                )}

                {!loading && history.length > 0 && (
                    <div className="space-y-3">
                        {history.map((entry, i) => {
                            const tc = typeColor(entry.detected_type);
                            return (
                                <motion.div
                                    key={entry.task_id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center gap-5 p-5 rounded-xl border cursor-pointer transition-all hover:border-white/15"
                                    style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.07)' }}
                                    onClick={() => reopenResult(entry)}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: tc.bg }}>
                                        <Database className="w-5 h-5" style={{ color: tc.color }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm truncate">{entry.filename}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                                                style={{ background: tc.bg, color: tc.color }}>
                                                {entry.detected_type || 'Unknown'}
                                            </span>
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                {(entry.result?.total_samples || 0).toLocaleString()} samples
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {entry.status === 'Completed' || entry.status === 'Optimized'
                                            ? <CheckCircle2 className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                            : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                        <span className="text-xs font-semibold"
                                            style={{ color: entry.status === 'Completed' || entry.status === 'Optimized' ? '#D4F03D' : '#ffa000' }}>
                                            {entry.status}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HistoryPage;
