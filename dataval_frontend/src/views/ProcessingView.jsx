import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, FileText, Settings, Database, Activity, AlertTriangle, ArrowRight, XCircle, Terminal, Cpu, Share2, Layers } from 'lucide-react';

const API_BASE = "http://localhost:8000";

const ProcessingView = ({ taskId, onComplete, onCancel }) => {
    const [taskStatus, setTaskStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(true);

    useEffect(() => {
        if (!taskId) return;

        const pollStatus = async () => {
            try {
                const response = await fetch(`${API_BASE}/status/${taskId}`);
                if (!response.ok) throw new Error('Failed to fetch status');

                const data = await response.json();
                setTaskStatus(data);

                if (data.status === 'Completed') {
                    setTimeout(() => onComplete(data), 1000); // Small buffer for UX
                } else if (data.status === 'Failed') {
                    setError(data.error || 'Processing failed');
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        const interval = setInterval(pollStatus, 1500);
        pollStatus();

        return () => clearInterval(interval);
    }, [taskId, onComplete]);

    const steps = [
        { id: 'integrity', title: 'File Integrity', status: taskStatus?.progress > 20 ? 'completed' : 'active', desc: 'SHA-256 Checksum', icon: ShieldCheckIcon },
        { id: 'types', title: 'Structure Detection', status: taskStatus?.progress > 50 ? 'completed' : (taskStatus?.progress > 20 ? 'active' : 'waiting'), desc: taskStatus?.detected_type || 'Scanning...', icon: Database },
        { id: 'analysis', title: 'Deep Analysis', status: taskStatus?.progress > 80 ? 'completed' : (taskStatus?.progress > 50 ? 'active' : 'waiting'), desc: 'Running heuristics...', icon: Activity },
        { id: 'finalizing', title: 'Report Generation', status: taskStatus?.progress === 100 ? 'completed' : (taskStatus?.progress > 80 ? 'active' : 'waiting'), desc: 'Compiling results...', icon: Layers },
    ];

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-background p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-red-500/20 p-16 rounded-[3rem] text-center max-w-xl shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-red-500/20"></div>
                    <XCircle className="w-20 h-20 text-red-500 mx-auto mb-8 animate-pulse" />
                    <h2 className="text-4xl font-bold mb-4 tracking-tight">Backend Failure</h2>
                    <p className="text-white/30 mb-10 text-lg">{error}</p>
                    <button
                        onClick={onCancel}
                        className="px-12 py-4 bg-white/5 border border-white/5 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95 flex items-center gap-3 mx-auto uppercase tracking-widest text-[11px]"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" /> Re-establish Link
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-12 min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-background shadow-[0_0_15px_rgba(212,240,61,0.2)]">
                        <div className="grid grid-cols-2 gap-0.5 scale-75">
                            <div className="w-2 h-2 bg-black rounded-sm"></div>
                            <div className="w-2 h-2 bg-black rounded-sm"></div>
                            <div className="w-2 h-2 bg-black rounded-sm"></div>
                            <div className="w-2 h-2 bg-black rounded-sm"></div>
                        </div>
                    </div>
                    <div className="h-5 w-px bg-white/10"></div>
                    <span className="font-bold tracking-tighter text-lg">System Core <span className="text-white/20 font-mono text-xs">v4.0</span></span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live Processing</span>
                    </div>
                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                        <Share2 className="w-4 h-4 text-white/40" />
                    </button>
                </div>
            </header>

            {/* Hero Stats */}
            <div className="grid grid-cols-12 gap-12 mb-12">
                <div className="col-span-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <p className="text-accent font-mono text-xs mb-4 flex items-center gap-2 tracking-widest uppercase">
                            <Terminal className="w-3.5 h-3.5" /> Task ID: {taskId?.split('-')[0]}
                        </p>
                        <h2 className="text-6xl font-black tracking-tighter mb-4 italic leading-none">
                            {taskStatus?.progress < 100 ? 'Deep Scan Protocol In-Progress' : 'Scan Finalized'}
                        </h2>
                        <div className="flex items-center gap-4 text-white/30">
                            <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 font-mono text-xs">{taskStatus?.filename || 'Awaiting...'}</span>
                            <div className="h-4 w-px bg-white/10"></div>
                            <span className="text-xs uppercase font-bold tracking-widest">Encryption: AES-256 Level</span>
                        </div>
                    </motion.div>
                </div>

                <div className="col-span-4 flex flex-col justify-end items-end">
                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-7xl font-black font-mono tracking-tighter">{taskStatus?.progress || 0}%</span>
                        <div className="h-12 w-1 bg-white/5 rounded-full relative overflow-hidden">
                            <motion.div className="absolute top-0 left-0 w-full bg-accent" animate={{ height: `${taskStatus?.progress || 0}%` }} />
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div className="h-full bg-accent shadow-[0_0_10px_rgba(212,240,61,0.5)]" animate={{ width: `${taskStatus?.progress || 0}%` }} />
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                {/* Visual Engine */}
                <div className="col-span-7 bg-card rounded-[3rem] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center group shadow-2xl">
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #D4F03D 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>

                    <div className="relative w-full h-full flex items-center justify-center scale-110">
                        <motion.div
                            className="absolute w-[80%] aspect-square rounded-full border-[0.5px] border-accent/20"
                            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.div
                            className="absolute w-[60%] aspect-square rounded-full border-[0.5px] border-accent/10"
                            animate={{ rotate: -360, scale: [1, 1.1, 1] }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        />

                        <div className="relative w-56 h-56 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-[4px] border-accent/5 border-t-accent shadow-[0_0_40px_rgba(212,240,61,0.1)] animate-spin"></div>
                            <div className="w-48 h-48 rounded-full bg-accent/5 flex items-center justify-center backdrop-blur-3xl group-hover:bg-accent/10 transition-all duration-700">
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                    <Database className="w-16 h-16 text-accent" />
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-12 left-12 flex flex-col gap-6">
                        <div className="flex items-center gap-4 px-6 py-3 bg-black/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                                <Settings className="w-5 h-5 text-accent" />
                            </motion.div>
                            <span className="text-xs font-mono text-white/60 tracking-widest uppercase">{taskStatus?.status || 'INITIALIZING'}</span>
                        </div>

                        <div className="flex gap-2">
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`h-1.5 w-12 rounded-full ${i < (taskStatus?.progress / 25) ? 'bg-accent shadow-[0_0_10px_rgba(212,240,61,0.3)]' : 'bg-white/5'}`}
                                    animate={i === Math.floor(taskStatus?.progress / 25) ? { opacity: [0.3, 1, 0.3] } : {}}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Diagnostic Pipeline */}
                <div className="col-span-5 flex flex-col gap-8 h-full">
                    <div className="bg-card rounded-[3rem] border border-white/5 p-10 flex-1 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Cpu className="w-6 h-6 text-accent" /> Pipeline
                            </h3>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {steps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-6 rounded-[2rem] border transition-all duration-500 ${step.status === 'active'
                                        ? 'bg-accent/10 border-accent/20 scale-[1.02]'
                                        : 'bg-white/[0.02] border-white/5 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${step.status === 'completed' ? 'bg-accent/10 text-accent' :
                                            step.status === 'active' ? 'bg-accent text-background shadow-lg' : 'bg-white/5 text-white/20'
                                            }`}>
                                            <step.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className={`font-bold text-base tracking-tight ${step.status === 'waiting' ? 'text-white/20' : 'text-white'}`}>{step.title}</h4>
                                                {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                                            </div>
                                            <p className="text-[11px] text-white/30 uppercase font-black tracking-widest">{step.desc}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={onCancel}
                            className="w-full mt-10 py-5 rounded-3xl border border-red-500/20 text-red-500/60 font-black text-xs uppercase tracking-[0.2em] hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <XCircle className="w-5 h-5" /> Terminate Link
                        </button>
                    </div>
                </div>
            </div>

            {/* Terminal Footer */}
            <AnimatePresence>
                {isTerminalOpen && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="mt-8 bg-card/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-5 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-accent">
                                <Terminal className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Stream</span>
                            </div>
                            <div className="h-4 w-px bg-white/10"></div>
                            <div className="flex-1 overflow-hidden transition-all">
                                {taskStatus?.diagnostics && taskStatus.diagnostics.length > 0 ? (
                                    <p className="font-mono text-[11px] text-white/50 truncate">
                                        <span className="text-accent underline decoration-accent/20 underline-offset-4 mr-4">[{new Date().toLocaleTimeString()}]</span>
                                        {taskStatus.diagnostics[taskStatus.diagnostics.length - 1]}
                                    </p>
                                ) : (
                                    <p className="font-mono text-[11px] text-white/20 animate-pulse tracking-widest uppercase">Syncing with backend engine...</p>
                                )}
                            </div>
                            <div className="flex items-center gap-8 ml-4">
                                <div className="hidden lg:flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Buffer: 95%</span>
                                    <div className="w-16 h-1 bg-white/5 rounded-full">
                                        <div className="h-full w-[95%] bg-accent/40 rounded-full"></div>
                                    </div>
                                </div>
                                <button className="text-[10px] font-black text-accent hover:text-white transition-colors uppercase tracking-[0.2em] underline decoration-accent/20 underline-offset-8">Documentation</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ShieldCheckIcon = (props) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
);

export default ProcessingView;
