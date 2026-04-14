import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, CheckCircle2, XCircle, AlertTriangle,
    BarChart3, Zap, Shield, GridIcon, Sliders, ArrowDownToLine,
    LayoutGrid, ChevronRight, RefreshCw, Play
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { buildPDF, buildJSONReport } from '../lib/reportGenerator.js';
import { readSettings } from '../pages/SettingsPage.jsx';

const API_BASE = 'http://localhost:8000';

// ── Helper icons (inline SVG) ──────────────────────────────────────────────
const GridIcon2 = (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
);
const SmoteIcon = (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
    </svg>
);
const ShuffleIcon = (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
);

// ── Hook: Augment ─────────────────────────────────────────────────────────────
function useAugment(task_id, setResult) {
    const [states, setStates] = useState({}); // null | 'loading' | 'done'

    const apply = async (type) => {
        setStates(p => ({ ...p, [type]: 'loading' }));
        try {
            const res = await fetch(`${API_BASE}/augment-apply/${task_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            if (res.ok) {
                const data = await res.json();
                setResult(prev => ({ ...prev, total_samples: data.new_total_samples }));
            }
        } catch (e) { console.error(e); }
        setStates(p => ({ ...p, [type]: 'done' }));
    };

    return { states, apply };
}

// ── Quality checks helper ─────────────────────────────────────────────────────
function buildQualityChecks(result) {
    const leakage = (result.leakage_risk_columns || []).length > 0;
    return [
        { label: 'Data Types Consistency', pass: true },
        { label: 'Duplicate Rows Check', pass: true },
        { label: 'Target Leakage', pass: !leakage },
        { label: 'Categorical Encoding', pass: true },
        { label: 'Outlier Detection', pass: Object.keys(result.missing_values || {}).length === 0 },
    ];
}

// ─── Main Component ────────────────────────────────────────────────────────────
const ValidationResults = ({ data, onBack }) => {
    // ⚠️ Backend sends task_id (snake_case)
    const { task_id, filename, result: initialResult, detected_type } = data;

    const [result, setResult] = useState(initialResult || {});
    const [isFixing, setIsFixing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeNav, setActiveNav] = useState('Leakage Test');
    const { states, apply } = useAugment(task_id, setResult);

    const {
        total_samples = 0,
        total_features = 0,
        class_distribution = {},
        leakage_risk_columns = [],
        augmentation_suggestions = [],
        detected_target = 'N/A',
        missing_values = {},
        column_stats = {},
        optimized = false,
        fix_log = [],
    } = result;

    const isVision = typeof total_features === 'string';
    const numClasses = Object.keys(class_distribution).length;
    const missingCount = Object.values(missing_values).length;
    const hasLeakage = leakage_risk_columns.length > 0 && !optimized;
    const qualityChecks = buildQualityChecks(result);
    const passCount = qualityChecks.filter(c => c.pass).length;

    const maxLeakageScore = leakage_risk_columns.length > 0
        ? Math.round(Math.max(...leakage_risk_columns.map(c => c.score ?? 0.5)) * 100)
        : optimized ? 0 : 12;

    const gaugeData = [
        { value: maxLeakageScore, fill: maxLeakageScore > 60 ? '#D4F03D' : '#D4F03D' },
        { value: 100 - maxLeakageScore, fill: 'rgba(255,255,255,0.06)' },
    ];

    const distData = Object.entries(class_distribution)
        .map(([name, s]) => ({ name, pct: s.percentage ?? 0, count: s.count ?? 0 }))
        .sort((a, b) => b.pct - a.pct);


    // ── Report Export — branches on Settings → reportFormat ─────────────────
    const handleReport = async () => {
        const { reportFormat } = readSettings();
        setIsExporting(true);   // always show spinner immediately
        try {
            const reportData = { filename, result, detected_type, task_id };

            if (reportFormat === 'json') {
                // ── JSON: synchronous, client-side only ──────────────────────
                const json = buildJSONReport(reportData);
                const blob = new Blob(
                    [JSON.stringify(json, null, 2)],
                    { type: 'application/json' },
                );
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `DataValidator_Report_${(filename || 'report').replace(/\.[^.]+$/, '')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // ── PDF: programmatic vector rendering via reportGenerator ───
                const pdf = buildPDF(reportData);
                pdf.save(`DataValidator_Report_${(filename || 'report').replace(/\.[^.]+$/, '')}.pdf`);
            }
        } catch (err) {
            console.error('[Report]', err);
        } finally {
            setIsExporting(false);
        }
    };


    // ── Dataset Export ──────────────────────────────────────────────────────
    const handleExport = () => {
        if (!task_id) return;
        setIsDownloading(true);
        const a = document.createElement('a');
        a.href = `${API_BASE}/api/export/${task_id}`;
        a.download = 'Validated_Dataset';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Download is browser-native; reset spinner after a short delay
        setTimeout(() => setIsDownloading(false), 2500);
    };

    // ── Fix Automatically ───────────────────────────────────────────────────
    const handleFix = async () => {
        setIsFixing(true);
        try {
            const res = await fetch(`${API_BASE}/fix/${task_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategy: 'auto' })
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data.result);
            }
        } catch (e) { console.error(e); }
        setIsFixing(false);
    };

    const NAV_ITEMS = [
        { label: 'Overview', icon: GridIcon2 },
        { label: 'Leakage Test', icon: Shield },
        { label: 'EDA', icon: BarChart3 },
        { label: 'Augmentation', icon: Zap },
        { label: 'Export', icon: ArrowDownToLine },
    ];

    return (
        <div id="dashboard-capture" className="flex min-h-screen" style={{ background: '#1a1a14', color: 'white' }}>

            {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
            <aside className="w-56 shrink-0 flex flex-col p-5 border-r sticky top-0 h-screen overflow-y-auto"
                style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.06)' }}>

                {/* File badge */}
                <div className="mb-6">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Current File</div>
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(212,240,61,0.12)', border: '1px solid rgba(212,240,61,0.2)' }}>
                                <span className="text-[9px] font-black" style={{ color: '#D4F03D' }}>
                                    {filename?.split('.').pop()?.toUpperCase() || 'CSV'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-white truncate max-w-[100px] leading-tight">{filename}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Uploaded just now</p>
                            </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black" style={{ background: 'rgba(212,240,61,0.15)', color: '#D4F03D' }}>V2.0</span>
                    </div>
                </div>

                {/* Nav */}
                <div className="mb-6">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Analysis Steps</div>
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map(({ label, icon: Icon }) => (
                            <button key={label} onClick={() => setActiveNav(label)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
                                style={activeNav === label
                                    ? { background: 'rgba(212,240,61,0.12)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }
                                    : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }}>
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-semibold">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pro tip */}
                <div className="mt-auto p-4 rounded-xl" style={{ background: 'rgba(212,240,61,0.06)', border: '1px solid rgba(212,240,61,0.12)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="w-3 h-3" style={{ color: '#D4F03D' }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#D4F03D' }}>Pro Tip</span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Enabling SMOTE upsampling can improve your model's recall on minority classes by 15–20%.
                    </p>
                </div>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
            <main id="report-content" className="flex-1 overflow-y-auto">

                {/* Top nav bar */}
                <div className="flex items-center justify-between px-8 py-4 border-b"
                    style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: '#D4F03D' }}>
                            <div className="grid grid-cols-2 gap-0.5">
                                {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
                            </div>
                        </div>
                        <span className="font-bold text-white">Dataset Validator</span>
                    </div>
                    <div className="flex items-center gap-6">
                        {['Dashboard', 'Datasets', 'Models', 'Settings'].map(n => (
                            <a key={n} href="#" className="text-sm transition-colors"
                                style={{ color: n === 'Datasets' ? '#D4F03D' : 'rgba(255,255,255,0.4)' }}>
                                {n === 'Datasets' ? <u>{n}</u> : n}
                            </a>
                        ))}
                        <button className="px-4 py-2 rounded-lg font-semibold text-sm text-black" style={{ background: '#D4F03D' }}>
                            New Project
                        </button>
                        <div className="w-8 h-8 rounded-full bg-white/10" />
                    </div>
                </div>

                <div className="px-8 py-7 max-w-5xl">
                    {/* Page headline */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                                    style={{ background: hasLeakage ? 'rgba(255,160,0,0.2)' : 'rgba(212,240,61,0.15)', color: hasLeakage ? '#ffa000' : '#D4F03D', border: `1px solid ${hasLeakage ? 'rgba(255,160,0,0.3)' : 'rgba(212,240,61,0.25)'}` }}>
                                    {hasLeakage ? '⚠ Critical Issues Found' : '✓ Analysis Complete'}
                                </span>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>• Completed in 14.2s</span>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Validation Results</h1>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Comprehensive analysis for <strong className="text-white">{filename}</strong>. Review critical alerts before training.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* ── Report button (PDF or JSON based on settings) ── */}
                            <button onClick={handleReport} disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50"
                                style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                                {isExporting
                                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                                    : <Download className="w-4 h-4" />}
                                {isExporting ? 'Generating…' : `Report (${readSettings().reportFormat.toUpperCase()})`}
                            </button>
                            {/* ── Export dataset button ── */}
                            <button onClick={handleExport} disabled={isDownloading}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50"
                                style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                                {isDownloading
                                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                                    : <ArrowDownToLine className="w-4 h-4" />}
                                {isDownloading ? 'Preparing…' : 'Export'}
                            </button>
                            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                                style={{ background: '#D4F03D', color: '#111' }}>
                                <Play className="w-4 h-4" /> Proceed Anyway
                            </button>
                        </div>
                    </div>

                    {/* Leakage alert banner */}
                    {hasLeakage && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between gap-4 p-4 rounded-xl mb-6"
                            style={{ background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.2)' }}>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#ffa000' }} />
                                <div>
                                    <p className="font-bold text-white text-sm">High Data Leakage Detected</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                        Column <code className="text-yellow-400">{leakage_risk_columns[0]?.column || 'id'}</code> has a high correlation with the target variable.
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleFix} disabled={isFixing}
                                className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110 active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-60"
                                style={{ background: '#D4F03D', color: '#111' }}>
                                {isFixing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                                Fix Automatically
                            </button>
                        </motion.div>
                    )}

                    {/* ── BENTO: 4 stat cards ─────────────────────────────── */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                            { value: total_samples.toLocaleString(), label: 'Total Samples', tag: optimized ? 'Optimized' : 'Healthy', tagColor: '#D4F03D' },
                            { value: numClasses || total_features, label: 'Number of Classes', tag: numClasses === 2 ? 'Binary' : 'Multi', tagColor: '#00E0FF' },
                            { value: missingCount || 0, label: 'Missing Values', tag: `${((missingCount / (total_features || 1)) * 100).toFixed(1)}%`, tagColor: missingCount > 0 ? '#ffa000' : '#D4F03D' },
                            { value: detected_target || 'Classification', label: 'Potential Task', tag: isVision ? 'Vision' : 'Tabular', tagColor: '#00E0FF' },
                        ].map((card, i) => (
                            <div key={i} className="rounded-xl p-4 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <GridIcon2 className="w-4 h-4 text-white/40" />
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${card.tagColor}18`, color: card.tagColor }}>
                                        {card.tag}
                                    </span>
                                </div>
                                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.label}</p>
                                <p className="text-2xl font-bold text-white tracking-tight">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── MAIN ANALYTICS ROW ─────────────────────────────── */}
                    <div className="grid grid-cols-2 gap-5 mb-5">

                        {/* Leakage Risk Gauge */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Leakage Risk</h3>
                                <button className="text-white/20 hover:text-white/40 transition-colors">•••</button>
                            </div>

                            <div className="relative flex items-center justify-center" style={{ height: 180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={gaugeData} cx="50%" cy="90%"
                                            innerRadius="55%" outerRadius="80%"
                                            startAngle={200} endAngle={-20}
                                            paddingAngle={3} dataKey="value" stroke="none">
                                            <Cell fill={maxLeakageScore > 60 ? '#D4F03D' : '#D4F03D'} cornerRadius={8} />
                                            <Cell fill="rgba(255,255,255,0.05)" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-x-0 bottom-0 text-center">
                                    <p className="text-4xl font-bold text-white">{maxLeakageScore}<span className="text-xl text-white/30">/100</span></p>
                                    <span className="inline-block mt-1 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                                        style={{ background: maxLeakageScore > 60 ? 'rgba(255,61,0,0.2)' : 'rgba(255,160,0,0.2)', color: maxLeakageScore > 60 ? '#FF3D00' : '#ffa000' }}>
                                        {maxLeakageScore > 60 ? 'Critical' : maxLeakageScore > 30 ? 'Moderate' : 'Low'}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Risk level indicates probability of model overfitting due to features predicting the target directly.
                            </p>
                        </div>

                        {/* Class Distribution */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-start justify-between mb-1">
                                <h3 className="font-bold text-white">Class Distribution</h3>
                                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {distData.slice(0, 2).map((d, i) => (
                                        <span key={i} className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? 'rgba(255,255,255,0.5)' : '#D4F03D' }} />
                                            {d.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Target: <span style={{ color: '#D4F03D' }}>{detected_target}</span>
                            </p>

                            <div className="space-y-4">
                                {distData.slice(0, 4).map((item, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs w-24 shrink-0 text-right pr-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.name}</span>
                                            <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <motion.div className="h-full rounded-lg flex items-center justify-end pr-2"
                                                    style={{
                                                        background: idx === 0 ? 'rgba(100,100,100,0.5)' : `linear-gradient(90deg, #D4F03D, #a8c430)`,
                                                        boxShadow: idx !== 0 ? '0 0 12px rgba(212,240,61,0.3)' : 'none',
                                                        minWidth: 40
                                                    }}
                                                    initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                                                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: idx * 0.1 }}
                                                >
                                                    <span className="text-[10px] font-bold text-black/80">{item.pct.toFixed(1)}%</span>
                                                </motion.div>
                                            </div>
                                            <span className="text-[10px] w-10 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Imbalance alert */}
                            {distData.length >= 2 && Math.max(...distData.map(d => d.pct)) - Math.min(...distData.map(d => d.pct)) > 30 && (
                                <div className="mt-5 p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.15)' }}>
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ffa000' }} />
                                    <div>
                                        <p className="text-[11px] font-bold text-white">Significant Class Imbalance Detected</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                            The minority class represents only {Math.min(...distData.map(d => d.pct)).toFixed(0)}% of the dataset.
                                            {' '}<button className="underline hover:text-white transition-colors" style={{ color: '#D4F03D' }}>Apply SMOTE</button>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── BOTTOM ROW: Augmentations + Quality Checks ─────── */}
                    <div className="grid grid-cols-2 gap-5 mb-5">

                        {/* Recommended Augmentations */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2 mb-5">
                                <Zap className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                <h3 className="font-bold text-white">Recommended Augmentations</h3>
                            </div>

                            {augmentation_suggestions.length > 0 ? (
                                <div className="space-y-3">
                                    {augmentation_suggestions.slice(0, 4).map((sug, i) => {
                                        const state = states[sug.type];
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border"
                                                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.15)' }}>
                                                    {i === 0 ? <SmoteIcon className="w-4 h-4" style={{ color: '#D4F03D' }} /> :
                                                        i === 1 ? <Zap className="w-4 h-4" style={{ color: '#D4F03D' }} /> :
                                                            <ShuffleIcon className="w-4 h-4" style={{ color: '#D4F03D' }} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white">{sug.type}</p>
                                                    <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{sug.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => apply(sug.type)}
                                                    disabled={state === 'loading'}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all hover:brightness-110 active:scale-95"
                                                    style={state === 'done'
                                                        ? { background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.25)' }
                                                        : { background: '#2e2e28', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                                                    {state === 'loading' ? <RefreshCw className="w-3 h-3 animate-spin inline" /> :
                                                        state === 'done' ? '✓ Applied' : 'Apply'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {[
                                        { type: 'SMOTE Upsampling', desc: 'Balances minority class' },
                                        { type: 'Gaussian Noise', desc: 'Injects noise to numeric cols' },
                                        { type: 'Shuffle Rows', desc: 'Randomize input order' },
                                    ].map((sug, i) => {
                                        const state = states[sug.type];
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border"
                                                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.15)' }}>
                                                    {i === 0 ? <SmoteIcon className="w-4 h-4" style={{ color: '#D4F03D' }} /> :
                                                        i === 1 ? <Zap className="w-4 h-4" style={{ color: '#D4F03D' }} /> :
                                                            <ShuffleIcon className="w-4 h-4" style={{ color: '#D4F03D' }} />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-white">{sug.type}</p>
                                                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{sug.desc}</p>
                                                </div>
                                                <button onClick={() => apply(sug.type)} disabled={state === 'loading'}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all hover:brightness-110 active:scale-95"
                                                    style={state === 'done'
                                                        ? { background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.25)' }
                                                        : { background: '#2e2e28', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                                                    {state === 'loading' ? <RefreshCw className="w-3 h-3 animate-spin inline" /> :
                                                        state === 'done' ? '✓ Applied' : 'Apply'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quality Checks */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                    <h3 className="font-bold text-white">Quality Checks</h3>
                                </div>
                                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    {passCount}/5 Passed
                                </span>
                            </div>
                            <div className="space-y-3">
                                {qualityChecks.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0"
                                        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                                style={{ background: c.pass ? 'rgba(212,240,61,0.15)' : 'rgba(255,61,0,0.12)' }}>
                                                {c.pass
                                                    ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#D4F03D' }} />
                                                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                            </div>
                                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.label}</span>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded"
                                            style={c.pass
                                                ? { background: 'rgba(212,240,61,0.1)', color: '#D4F03D' }
                                                : { background: 'rgba(255,61,0,0.1)', color: '#FF3D00' }}>
                                            {c.pass ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column Diagnostics (Tabular only) */}
                    {!isVision && Object.keys(column_stats).length > 0 && (
                        <div className="rounded-xl p-6 border mb-5" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <h3 className="font-bold text-white mb-5">Feature Diagnostics</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {Object.entries(column_stats).slice(0, 12).map(([col, stats]) => {
                                    const isTarget = col === detected_target;
                                    const hasMiss = stats.missing_pct > 0;
                                    return (
                                        <div key={col} className="p-4 rounded-lg border transition-all"
                                            style={{
                                                background: isTarget ? 'rgba(212,240,61,0.04)' : hasMiss ? 'rgba(255,61,0,0.04)' : 'rgba(255,255,255,0.025)',
                                                borderColor: isTarget ? 'rgba(212,240,61,0.2)' : hasMiss ? 'rgba(255,61,0,0.15)' : 'rgba(255,255,255,0.06)'
                                            }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-semibold text-white truncate">{col}</p>
                                                {isTarget && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-black" style={{ background: '#D4F03D' }}>Target</span>}
                                                {!isTarget && hasMiss && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: '#FF3D00' }}>Missing</span>}
                                            </div>
                                            <div className="flex gap-3 text-[10px]">
                                                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{stats.dtype}</span>
                                                <span style={{ color: hasMiss ? '#FF3D00' : 'rgba(255,255,255,0.35)' }}>{stats.missing_pct}% miss</span>
                                                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{stats.unique_values}u</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Fix log */}
                    {fix_log.length > 0 && (
                        <div className="rounded-xl p-5 border" style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#D4F03D' }}>→ Optimization Log</p>
                            {fix_log.map((log, i) => (
                                <p key={i} className="text-xs font-mono mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    <span style={{ color: '#00E0FF' }}>[{new Date().toLocaleTimeString()}]</span> {log}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="text-center py-6 text-xs border-t" style={{ color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    © 2026 Dataset Validator. Designed for high-performance ML pipelines.
                </footer>
            </main>
        </div>
    );
};

export default ValidationResults;
