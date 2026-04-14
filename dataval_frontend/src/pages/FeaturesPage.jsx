/**
 * FeaturesPage.jsx — Public features overview for DataValidator
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../components/NavBar.jsx';
import {
    Shield, BarChart3, Zap, Database, AlertTriangle,
    Activity, CheckCircle2, ArrowRight, ChevronRight,
} from 'lucide-react';

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

const FEATURES = [
    {
        icon: Shield,
        title: 'Data Leakage Detection',
        items: [
            'Per-column correlation scoring against the target variable',
            'Flags columns with correlation ≥ configurable threshold (default 0.95)',
            'Supports Tabular, Classification, and Segmentation datasets',
        ],
    },
    {
        icon: BarChart3,
        title: 'Missing Value Analysis',
        items: [
            'Null count and null percentage per column',
            'Identifies MCAR / MAR patterns through missingness correlation',
            'Suggests mean, median, or mode imputation strategies per column type',
        ],
    },
    {
        icon: Zap,
        title: 'Class Distribution Check',
        items: [
            'Per-class sample counts and percentage breakdown',
            'Imbalance ratio calculation for binary and multi-class targets',
            'Recommends SMOTE, oversampling, or augmentation based on ratios',
        ],
    },
    {
        icon: Database,
        title: 'Dataset Health Reporting',
        items: [
            'Composite health score (0–100) based on detected issues',
            'Schema validation: column types, cardinality, and uniqueness checks',
            'Duplicate row detection with configurable similarity threshold',
        ],
    },
    {
        icon: AlertTriangle,
        title: 'Outlier Flagging',
        items: [
            'IQR-based outlier detection per numeric column',
            'Z-score analysis with configurable sensitivity',
            'Per-row issue log exportable as CSV or JSON',
        ],
    },
    {
        icon: Activity,
        title: 'Augmentation Engine',
        items: [
            'Vision: Gaussian Noise, Horizontal Flip, Random Rotation, Color Jitter, Elastic Deformation',
            'Tabular: SMOTE Upsampling, Gaussian Noise injection, Oversampling, Row Shuffling',
            'Files modified in-place; augmented content included in next export automatically',
        ],
    },
];

const FeaturesPage = () => (
    <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: '#fff' }}>
        <NavBar variant="public" />

        {/* Hero */}
        <section className="text-center py-20 px-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,240,61,0.07) 0%, transparent 70%)',
            }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
                    style={{ background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }}>
                    Platform Features
                </span>
                <h1 className="text-5xl font-black tracking-tight mb-4">What DataValidator Does</h1>
                <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    A complete set of analysis tools purpose-built for ML practitioners who need
                    actionable data quality reports, not just summary statistics.
                </p>
            </motion.div>
        </section>

        {/* Feature grid */}
        <section className="max-w-5xl mx-auto px-8 pb-20 w-full">
            <div className="grid grid-cols-2 gap-5">
                {FEATURES.map(({ icon: Icon, title, items }, idx) => (
                    <motion.div key={title}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, duration: 0.4 }}
                        className="rounded-2xl p-6"
                        style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.15)' }}>
                                <Icon className="w-4 h-4" style={{ color: '#D4F03D' }} />
                            </div>
                            <h2 className="font-bold text-white">{title}</h2>
                        </div>
                        <ul className="space-y-2">
                            {items.map(item => (
                                <li key={item} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#D4F03D' }} />
                                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* CTA */}
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="max-w-5xl mx-auto px-8 py-10 flex items-center justify-between">
                <div>
                    <p className="font-bold text-white text-lg">Ready to validate your dataset?</p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Upload any CSV or ZIP archive and get a full report in seconds.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to="/demo" className="px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/5 transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                        Try the Demo
                    </Link>
                    <Link to="/signup" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black hover:brightness-110 transition-all"
                        style={{ background: '#D4F03D' }}>
                        Get Started <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    </div>
);

export default FeaturesPage;
