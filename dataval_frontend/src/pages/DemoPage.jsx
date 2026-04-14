/**
 * DemoPage.jsx — Public demo page for DataValidator
 *
 * Shows pre-loaded mock analysis results so visitors can explore the tool
 * without signing up. Fully public (no auth required).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../components/NavBar.jsx';
import {
    Shield, AlertTriangle, CheckCircle2, BarChart3,
    ArrowRight, Database, Activity, ChevronRight, Info,
} from 'lucide-react';

/* ── Shared logo ──────────────────────────────────────────────────────────── */
const Logo = () => (
    <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4F03D' }}>
            <div className="grid grid-cols-2 gap-0.5">
                {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
            </div>
        </div>
        <span className="font-bold text-base tracking-tight text-white">DataValidator</span>
    </div>
);

/* ── Mock analysis data ───────────────────────────────────────────────────── */
const MOCK = {
    filename: 'customer_churn_sample.csv',
    detected_type: 'Tabular Data',
    file_size_bytes: 1_240_000,
    total_rows: 7043,
    total_columns: 21,
    health_score: 74,
    health_label: 'Moderate',
    missing_values: [
        { column: 'TotalCharges', null_count: 11, null_pct: 0.16 },
        { column: 'MonthlyCharges', null_count: 3, null_pct: 0.04 },
    ],
    leakage_risk: [
        { column: 'CustomerID', correlation: 0.99, risk: 'High' },
        { column: 'InvoiceID', correlation: 0.96, risk: 'High' },
    ],
    class_distribution: [
        { label: 'No Churn', count: 5174, pct: 73.5 },
        { label: 'Churned',  count: 1869, pct: 26.5 },
    ],
    column_stats: [
        { name: 'tenure',         dtype: 'int64',   unique: 73,   nulls: 0 },
        { name: 'MonthlyCharges', dtype: 'float64', unique: 1585, nulls: 3 },
        { name: 'TotalCharges',   dtype: 'float64', unique: 6531, nulls: 11 },
        { name: 'Contract',       dtype: 'object',  unique: 3,    nulls: 0 },
        { name: 'PaymentMethod',  dtype: 'object',  unique: 4,    nulls: 0 },
        { name: 'Churn',          dtype: 'object',  unique: 2,    nulls: 0 },
    ],
    diagnostics: [
        'File staged — ready for analysis.',
        'Staged: customer_churn_sample.csv (1.2 MB)',
        'Checking file integrity (SHA-256)…',
        'Detecting dataset type and structure…',
        'Identified: Tabular Data',
        'Running deep analysis…',
        'Loaded 7043 rows × 21 columns',
        'Warning: High cardinality in "TotalCharges" — possible ID/key column.',
        'Running leakage scan…',
        'Leakage scan complete.',
        'Generating EDA report…',
        'Final analysis report compiled.',
    ],
};

/* ── Sub-components ───────────────────────────────────────────────────────── */
const SectionCard = ({ children, className = '' }) => (
    <div className={`rounded-2xl p-6 ${className}`}
        style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.07)' }}>
        {children}
    </div>
);

const Badge = ({ color = '#D4F03D', label }) => (
    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
        style={{ background: `${color}1a`, color, border: `1px solid ${color}33` }}>
        {label}
    </span>
);

const ProgressBar = ({ pct, color = '#D4F03D' }) => (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
    </div>
);

/* ── Tab buttons ─────────────────────────────────────────────────────────── */
const TABS = ['Overview', 'Missing Values', 'Leakage Risk', 'Class Distribution', 'Column Stats', 'Logs'];

/* ── Page ────────────────────────────────────────────────────────────────── */
const DemoPage = () => {
    const [activeTab, setActiveTab] = useState('Overview');

    const healthColor = MOCK.health_score >= 80 ? '#D4F03D'
        : MOCK.health_score >= 60 ? '#FEBC2E' : '#FF5F57';

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: '#fff' }}>

            {/* ── Navbar ── */}
            <NavBar variant="public" />

            {/* ── Page header ── */}
            <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="max-w-5xl mx-auto px-8 py-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(212,240,61,0.12)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }}>
                                    Live Demo
                                </span>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Pre-loaded sample — no sign-up needed</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight mb-1">
                                Analysis Report
                            </h1>
                            <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                <Database className="w-3.5 h-3.5" />
                                {MOCK.filename}
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                {MOCK.total_rows.toLocaleString()} rows · {MOCK.total_columns} columns
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                {(MOCK.file_size_bytes / 1e6).toFixed(1)} MB
                            </p>
                        </div>
                        <Link to="/signup"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black hover:brightness-110 transition-all"
                            style={{ background: '#D4F03D', boxShadow: '0 0 20px rgba(212,240,61,0.25)' }}>
                            Analyse My Dataset <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="max-w-5xl mx-auto px-8">
                    <div className="flex gap-1 -mb-px overflow-x-auto">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all"
                                style={{
                                    color: activeTab === tab ? '#D4F03D' : 'rgba(255,255,255,0.4)',
                                    borderColor: activeTab === tab ? '#D4F03D' : 'transparent',
                                    background: 'none',
                                }}>
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-8">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}>

                    {/* Overview */}
                    {activeTab === 'Overview' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: 'Health Score', value: `${MOCK.health_score}/100`, icon: Activity, color: healthColor },
                                    { label: 'Total Rows', value: MOCK.total_rows.toLocaleString(), icon: Database, color: '#D4F03D' },
                                    { label: 'Leakage Risks', value: MOCK.leakage_risk.length, icon: Shield, color: '#FF5F57' },
                                    { label: 'Missing Values', value: MOCK.missing_values.reduce((a, c) => a + c.null_count, 0), icon: AlertTriangle, color: '#FEBC2E' },
                                ].map(({ label, value, icon: Icon, color }) => (
                                    <SectionCard key={label}>
                                        <Icon className="w-5 h-5 mb-3" style={{ color }} />
                                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                                        <p className="text-2xl font-black" style={{ color }}>{value}</p>
                                    </SectionCard>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <SectionCard>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-4"
                                        style={{ color: 'rgba(255,255,255,0.35)' }}>Dataset Health</p>
                                    <div className="flex items-end gap-3 mb-3">
                                        <span className="text-5xl font-black" style={{ color: healthColor }}>{MOCK.health_score}</span>
                                        <span className="text-lg font-bold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</span>
                                        <Badge color={healthColor} label={MOCK.health_label} />
                                    </div>
                                    <ProgressBar pct={MOCK.health_score} color={healthColor} />
                                    <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                        Score is reduced by leakage risks (−18 pts) and missing values (−8 pts).
                                    </p>
                                </SectionCard>
                                <SectionCard>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-4"
                                        style={{ color: 'rgba(255,255,255,0.35)' }}>Detection Summary</p>
                                    <ul className="space-y-3">
                                        {[
                                            { label: 'Dataset type detected', detail: MOCK.detected_type, ok: true },
                                            { label: 'Leakage columns found', detail: `${MOCK.leakage_risk.length} columns at risk`, ok: false },
                                            { label: 'Missing value columns', detail: `${MOCK.missing_values.length} columns affected`, ok: false },
                                            { label: 'Class imbalance', detail: 'Moderate — 73.5% vs 26.5%', ok: false },
                                        ].map(({ label, detail, ok }) => (
                                            <li key={label} className="flex items-start gap-2.5">
                                                {ok
                                                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D4F03D' }} />
                                                    : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#FEBC2E' }} />
                                                }
                                                <div>
                                                    <p className="text-sm font-medium text-white">{label}</p>
                                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{detail}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </SectionCard>
                            </div>
                        </div>
                    )}

                    {/* Missing Values */}
                    {activeTab === 'Missing Values' && (
                        <SectionCard>
                            <p className="text-sm font-bold mb-4 text-white">Missing Value Report</p>
                            {MOCK.missing_values.length === 0
                                ? <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No missing values detected.</p>
                                : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr style={{ color: 'rgba(255,255,255,0.35)' }}>
                                                <th className="text-left pb-3 font-semibold text-xs uppercase tracking-wider">Column</th>
                                                <th className="text-right pb-3 font-semibold text-xs uppercase tracking-wider">Null Count</th>
                                                <th className="text-right pb-3 font-semibold text-xs uppercase tracking-wider">Null %</th>
                                                <th className="text-left pb-3 pl-4 font-semibold text-xs uppercase tracking-wider">Fill Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {MOCK.missing_values.map(row => (
                                                <tr key={row.column} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                    <td className="py-3 font-mono text-white">{row.column}</td>
                                                    <td className="py-3 text-right" style={{ color: '#FEBC2E' }}>{row.null_count}</td>
                                                    <td className="py-3 text-right" style={{ color: '#FEBC2E' }}>{row.null_pct.toFixed(2)}%</td>
                                                    <td className="py-3 pl-4 w-40">
                                                        <ProgressBar pct={100 - row.null_pct} color="#D4F03D" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                        </SectionCard>
                    )}

                    {/* Leakage Risk */}
                    {activeTab === 'Leakage Risk' && (
                        <SectionCard>
                            <div className="flex items-center gap-2 mb-4">
                                <p className="text-sm font-bold text-white">Data Leakage Risk Columns</p>
                                <Info className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                            </div>
                            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Columns with correlation ≥ 0.95 to the target variable are flagged as leakage risks.
                                These should be dropped before training.
                            </p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ color: 'rgba(255,255,255,0.35)' }}>
                                        <th className="text-left pb-3 font-semibold text-xs uppercase tracking-wider">Column</th>
                                        <th className="text-right pb-3 font-semibold text-xs uppercase tracking-wider">Correlation</th>
                                        <th className="text-left pl-4 pb-3 font-semibold text-xs uppercase tracking-wider">Risk Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK.leakage_risk.map(row => (
                                        <tr key={row.column} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <td className="py-3 font-mono text-white">{row.column}</td>
                                            <td className="py-3 text-right" style={{ color: '#FF5F57' }}>{row.correlation.toFixed(2)}</td>
                                            <td className="py-3 pl-4"><Badge color="#FF5F57" label={row.risk} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SectionCard>
                    )}

                    {/* Class Distribution */}
                    {activeTab === 'Class Distribution' && (
                        <SectionCard>
                            <p className="text-sm font-bold mb-4 text-white">Target Column: <span className="font-mono" style={{ color: '#D4F03D' }}>Churn</span></p>
                            <div className="space-y-4">
                                {MOCK.class_distribution.map(cls => (
                                    <div key={cls.label}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="font-medium text-white">{cls.label}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{cls.count.toLocaleString()} samples · {cls.pct}%</span>
                                        </div>
                                        <ProgressBar pct={cls.pct} color={cls.pct > 50 ? '#D4F03D' : '#FEBC2E'} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(254,188,46,0.06)', border: '1px solid rgba(254,188,46,0.15)' }}>
                                <p className="text-xs font-semibold" style={{ color: '#FEBC2E' }}>
                                    Imbalance Detected — Suggestion: Apply SMOTE upsampling to the minority class before training.
                                </p>
                            </div>
                        </SectionCard>
                    )}

                    {/* Column Stats */}
                    {activeTab === 'Column Stats' && (
                        <SectionCard>
                            <p className="text-sm font-bold mb-4 text-white">Column Schema (6 of {MOCK.total_columns} shown)</p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ color: 'rgba(255,255,255,0.35)' }}>
                                        {['Column', 'Type', 'Unique Values', 'Null Count'].map(h => (
                                            <th key={h} className="text-left pb-3 font-semibold text-xs uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK.column_stats.map(col => (
                                        <tr key={col.name} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <td className="py-3 font-mono text-white">{col.name}</td>
                                            <td className="py-3"><Badge color="#00E0FF" label={col.dtype} /></td>
                                            <td className="py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{col.unique.toLocaleString()}</td>
                                            <td className="py-3" style={{ color: col.nulls > 0 ? '#FEBC2E' : 'rgba(255,255,255,0.4)' }}>
                                                {col.nulls}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Sign up to see full schema, outlier flags, and per-column distributions for all {MOCK.total_columns} columns.
                            </p>
                        </SectionCard>
                    )}

                    {/* Logs */}
                    {activeTab === 'Logs' && (
                        <SectionCard>
                            <p className="text-sm font-bold mb-4 text-white">Analysis Diagnostics</p>
                            <div className="font-mono text-xs space-y-1.5">
                                {MOCK.diagnostics.map((line, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="shrink-0 tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span style={{ color: line.toLowerCase().includes('warning') ? '#FEBC2E' : 'rgba(255,255,255,0.55)' }}>
                                            {line}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                </motion.div>
            </div>

            {/* ── Bottom CTA banner ── */}
            <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(212,240,61,0.04)' }}>
                <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
                    <div>
                        <p className="font-bold text-white">Like what you see?</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Upload your own dataset and get a full analysis report in seconds.
                        </p>
                    </div>
                    <Link to="/signup"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-black hover:brightness-110 transition-all"
                        style={{ background: '#D4F03D' }}>
                        Start for Free <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DemoPage;
