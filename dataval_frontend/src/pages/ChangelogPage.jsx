/**
 * ChangelogPage.jsx — Version history for DataValidator
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../components/NavBar.jsx';
import { CheckCircle2, ArrowRight, Zap, Shield, Database } from 'lucide-react';

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

const CHANGELOG = [
    {
        version: 'v2.0.0',
        date: 'April 2026',
        label: 'Latest',
        labelColor: '#D4F03D',
        changes: [
            { icon: Shield, text: 'Production-grade JWT authentication with secure SECRET_KEY via environment variables' },
            { icon: Database, text: 'PostgreSQL support with connection pool tuning; SQLite fallback for local development' },
            { icon: Zap, text: 'Automatic disk garbage collection — task data deleted after export or abort' },
            { icon: CheckCircle2, text: 'Dynamic CORS configuration from FRONTEND_URL environment variable' },
            { icon: CheckCircle2, text: 'Chunked file upload architecture for large datasets (ZIP, Parquet, CSV)' },
            { icon: CheckCircle2, text: 'ThreadPoolExecutor-based ML analysis with real-time abort support' },
            { icon: CheckCircle2, text: 'Per-task diagnostic log streaming and abort event propagation' },
        ],
    },
    {
        version: 'v1.5.0',
        date: 'March 2026',
        label: 'Previous',
        labelColor: 'rgba(255,255,255,0.3)',
        changes: [
            { icon: CheckCircle2, text: 'Augmentation engine: 10 transform types for vision and tabular datasets' },
            { icon: CheckCircle2, text: 'SMOTE upsampling and Gaussian noise injection for tabular data' },
            { icon: CheckCircle2, text: 'Auto-fix leakage columns and class imbalance via /fix endpoint' },
            { icon: CheckCircle2, text: 'Export validated datasets as ZIP (images) or CSV (tabular)' },
        ],
    },
    {
        version: 'v1.0.0',
        date: 'February 2026',
        label: 'Initial Release',
        labelColor: 'rgba(255,255,255,0.25)',
        changes: [
            { icon: CheckCircle2, text: 'Core EDA: missing values, class distribution, leakage detection' },
            { icon: CheckCircle2, text: 'Tabular Data, Classification, Segmentation dataset type detection' },
            { icon: CheckCircle2, text: 'User authentication: register, login, JWT session management' },
            { icon: CheckCircle2, text: 'Task history and analysis status polling' },
        ],
    },
];

const ChangelogPage = () => (
    <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: '#fff' }}>
        <NavBar variant="public" />

        <section className="text-center py-20 px-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,240,61,0.07) 0%, transparent 70%)',
            }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
                    style={{ background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }}>
                    Changelog
                </span>
                <h1 className="text-5xl font-black tracking-tight mb-4">Version History</h1>
                <p className="text-base max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    A record of every major release and the improvements shipped in each version.
                </p>
            </motion.div>
        </section>

        <div className="max-w-3xl mx-auto px-8 pb-20 w-full space-y-6">
            {CHANGELOG.map(({ version, date, label, labelColor, changes }, idx) => (
                <motion.div key={version}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                    className="rounded-2xl p-6"
                    style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3 mb-5">
                        <span className="font-black text-lg text-white">{version}</span>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: `${labelColor}1a`, color: labelColor, border: `1px solid ${labelColor}33` }}>
                            {label}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{date}</span>
                    </div>
                    <ul className="space-y-3">
                        {changes.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-start gap-2.5">
                                <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D4F03D' }} />
                                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            ))}
        </div>

        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="max-w-5xl mx-auto px-8 py-10 flex items-center justify-between">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Built by <span style={{ color: 'rgba(255,255,255,0.6)' }}>Yiğit Özdemir</span>
                </p>
                <Link to="/signup" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black hover:brightness-110 transition-all"
                    style={{ background: '#D4F03D' }}>
                    Get Started <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    </div>
);

export default ChangelogPage;
