import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight, Shield, BarChart3, Zap, CheckCircle2,
    ChevronRight, Mail, Github, Linkedin, Database,
    AlertTriangle, Activity,
} from 'lucide-react';
import NavBar from '../components/NavBar.jsx';

/* ── Logo ────────────────────────────────────────────────────────────────── */
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

/* ── Animated counter hook ───────────────────────────────────────────────── */
function useCountUp(target, duration = 2200, suffix = '') {
    const [display, setDisplay] = useState('0');
    const rafRef = useRef(null);
    const startRef = useRef(null);

    useEffect(() => {
        const animate = (ts) => {
            if (!startRef.current) startRef.current = ts;
            const elapsed = ts - startRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);

            if (current >= 1000) {
                setDisplay((current / 1000).toFixed(current >= 10000 ? 0 : 1) + 'K' + suffix);
            } else {
                setDisplay(current + suffix);
            }

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration, suffix]);

    return display;
}

/* ── Animated Stat Cell ──────────────────────────────────────────────────── */
const AnimatedStat = ({ icon: Icon, label, target, suffix, delay = 0 }) => {
    const [started, setStarted] = useState(false);
    const ref = useRef(null);
    const value = useCountUp(started ? target : 0, 2200, suffix);

    useEffect(() => {
        const timer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div ref={ref} className="flex items-center gap-4 py-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.18)' }}>
                <Icon className="w-4 h-4" style={{ color: '#D4F03D' }} />
            </div>
            <div>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-0.5"
                    style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</p>
                <p className="font-black text-xl text-white tabular-nums">{value}</p>
            </div>
        </div>
    );
};

/* ── Code Snippet ────────────────────────────────────────────────────────── */
const CodeSnippet = () => (
    <div className="rounded-xl overflow-hidden text-xs font-mono"
        style={{ background: '#1a1a14', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-1.5 px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
            <span className="ml-2 text-white/30 text-[10px]">utils.py</span>
        </div>
        <pre className="p-4 leading-6 overflow-x-auto">
            <span style={{ color: '#888' }}>{'# import pandas as pd\n'}</span>
            <span style={{ color: '#888' }}>{'from datacheck import Validator\n\n'}</span>
            <span style={{ color: '#888' }}>{'# Load your dataset\n'}</span>
            <span style={{ color: '#D4F03D' }}>df</span>
            <span style={{ color: '#fff' }}>{' = pd.read_csv("customer_churn.csv")\n\n'}</span>
            <span style={{ color: '#888' }}>{'# Instantiate a validation session\n'}</span>
            <span style={{ color: '#D4F03D' }}>validator</span>
            <span style={{ color: '#fff' }}>{' = Validator(df, target="churn")\n\n'}</span>
            <span style={{ color: '#888' }}>{'# Run full analysis suite\n'}</span>
            <span style={{ color: '#D4F03D' }}>report</span>
            <span style={{ color: '#fff' }}>{' = validator.run_full_suite()\n\n'}</span>
            <span style={{ color: '#fff' }}>{'print(f"Leakage score: {report.leakage_score}")\n'}</span>
            <span style={{ color: '#fff' }}>{'print(f"Health label:  {report.health_label}")'}</span>
        </pre>
    </div>
);

/* ── Feature Cards data ──────────────────────────────────────────────────── */
const FEATURES = [
    {
        icon: Shield,
        title: 'Data Leakage Detection',
        desc: 'Identifies target leakage and feature correlation anomalies before model training. Prevents silent overfitting with per-column risk scoring.',
        link: 'View capabilities →',
        href: '/features',
    },
    {
        icon: BarChart3,
        title: 'Missing Value Analysis',
        desc: 'Reports missing-value patterns (MCAR / MAR / MNAR), computes null ratios per column, and surfaces imputation strategy recommendations.',
        link: 'Learn more →',
        href: '/features',
    },
    {
        icon: Zap,
        title: 'Class Distribution Check',
        desc: 'Detects class imbalance, calculates per-class sample counts and percentages, and suggests oversampling or augmentation strategies.',
        link: 'See demo →',
        href: '/demo',
    },
    {
        icon: Database,
        title: 'Dataset Health Reporting',
        desc: 'Generates a structured health report covering schema validation, duplicate detection, outlier flagging, and cardinality warnings.',
        link: 'View sample →',
        href: '/demo',
    },
    {
        icon: AlertTriangle,
        title: 'Duplicate & Outlier Flagging',
        desc: 'Scans for exact and near-duplicate rows, detects statistical outliers per numeric feature, and exports a per-row issue log.',
        link: 'Learn more →',
        href: '/features',
    },
    {
        icon: Activity,
        title: 'Augmentation Engine',
        desc: 'Applies Gaussian noise, SMOTE upsampling, horizontal flips, and 6 other transforms directly to the dataset files on-server.',
        link: 'Explore →',
        href: '/features',
    },
];

/* ── Footer links ────────────────────────────────────────────────────────── */
const FOOTER_LINKS = {
    Product: [
        { label: 'Features',      href: '/features' },
        { label: 'Changelog',     href: '/changelog' },
        { label: 'Integrations',  href: '/integrations' },
    ],
    Resources: [
        { label: 'Documentation', href: '/docs' },
        { label: 'Demo',          href: '/demo' },
    ],
};

/* ── Main Component ──────────────────────────────────────────────────────── */
const LandingPage = () => {
    const featuresRef = useRef(null);
    const navigate = useNavigate();

    const scrollToFeatures = (e) => {
        e.preventDefault();
        featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: '#fff' }}>

            {/* ── Navbar ── */}
            <NavBar variant="public" />

            {/* ── Hero ── */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,240,61,0.08) 0%, transparent 70%)',
                }} />

                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    {/* Attribution badge */}
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        A project by Yiğit Özdemir
                    </span>

                    <h1 className="text-6xl font-black tracking-tight mb-5 max-w-3xl leading-tight">
                        Validate Your{' '}
                        <span style={{ color: '#D4F03D' }}>Datasets</span>{' '}
                        with Precision
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Detect data leakage, class imbalance, and structural issues before you train.
                        Automated EDA, health reporting, and augmentation in one tool.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => navigate('/signup')}
                            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-black transition-all hover:brightness-110 active:scale-95"
                            style={{ background: '#D4F03D', boxShadow: '0 0 30px rgba(212,240,61,0.3)' }}>
                            Analyze My Data <ArrowRight className="w-4 h-4" />
                        </button>
                        <Link to="/demo"
                            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                            View Demo
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* ── Stats bar (animated counters) ── */}
            <div className="border-y" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
                <div className="max-w-4xl mx-auto px-8 py-6 grid grid-cols-3 divide-x"
                    style={{ divideColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="pr-8">
                        <AnimatedStat icon={Database} label="Rows Processed" target={500000} suffix="+" delay={0} />
                    </div>
                    <div className="px-8">
                        <AnimatedStat icon={CheckCircle2} label="Datasets Validated" target={1000} suffix="+" delay={300} />
                    </div>
                    <div className="pl-8">
                        <AnimatedStat icon={AlertTriangle} label="Issues Detected" target={5000} suffix="+" delay={600} />
                    </div>
                </div>
            </div>

            {/* ── Features section ── */}
            <section id="features" ref={featuresRef} className="py-24 px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
                            style={{ background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }}>
                            Platform Capabilities
                        </span>
                        <h2 className="text-4xl font-black tracking-tight mb-4">What DataValidator Checks</h2>
                        <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Purpose-built analysis tools for ML practitioners who need actionable reports,
                            not just pretty charts.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-5">
                        {FEATURES.map(({ icon: Icon, title, desc, link, href }) => (
                            <motion.div key={title}
                                whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(212,240,61,0.08)' }}
                                transition={{ duration: 0.2 }}
                                className="rounded-2xl p-6 cursor-pointer flex flex-col"
                                style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                                    style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.15)' }}>
                                    <Icon className="w-5 h-5" style={{ color: '#D4F03D' }} />
                                </div>
                                <h3 className="font-bold text-white mb-2">{title}</h3>
                                <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
                                <Link to={href} className="text-xs font-semibold flex items-center gap-1 mt-auto"
                                    style={{ color: '#D4F03D' }}>
                                    {link} <ChevronRight className="w-3 h-3" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Integration / Code section ── */}
            <section className="py-20 px-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="max-w-5xl mx-auto grid grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight mb-4">
                            Designed to Work With<br />
                            <span style={{ color: '#D4F03D' }}>Pandas, NumPy & CSV</span>
                        </h2>
                        <p className="text-base mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Upload any CSV, ZIP archive, or structured file — DataValidator handles detection,
                            parsing, and reporting without changing your existing workflow.
                        </p>
                        {[
                            'CSV, Excel, JSON, Parquet supported',
                            'ZIP archive extraction & multi-file analysis',
                            'Per-column and per-row issue reporting',
                        ].map(item => (
                            <div key={item} className="flex items-center gap-3 mb-3">
                                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#D4F03D' }} />
                                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                            </div>
                        ))}
                        <Link to="/integrations"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold mt-4"
                            style={{ color: '#D4F03D' }}>
                            View all supported formats <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <CodeSnippet />
                </div>
            </section>

            {/* ── CTA section ── */}
            <section className="py-24 px-8 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }} viewport={{ once: true }}>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6"
                        style={{ background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }}>
                        Created by Yiğit Özdemir
                    </span>
                    <h2 className="text-5xl font-black tracking-tight mb-4">Ready to validate your data?</h2>
                    <p className="mb-10 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Upload a dataset and receive a structured quality report in seconds.
                        No credit card required.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link to="/signup"
                            className="px-8 py-3.5 rounded-xl font-bold text-sm text-black transition-all hover:brightness-110 active:scale-95"
                            style={{ background: '#D4F03D', boxShadow: '0 0 30px rgba(212,240,61,0.25)' }}>
                            Get Started
                        </Link>
                        <Link to="/demo"
                            className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                            Explore the Demo
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="max-w-5xl mx-auto px-8 py-14">
                    <div className="grid grid-cols-4 gap-10 mb-12">
                        {/* Brand */}
                        <div>
                            <Logo />
                            <p className="text-xs mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Dataset validation & quality assurance for ML pipelines.
                            </p>
                            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                A project by <span style={{ color: 'rgba(255,255,255,0.5)' }}>Yiğit Özdemir</span>
                            </p>
                            <div className="flex items-center gap-2.5 mt-4">
                                {/* Mail */}
                                <a href="mailto:yigitozdemir5225@gmail.com"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                    title="Email">
                                    <Mail className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                </a>
                                {/* LinkedIn */}
                                <a href="https://www.linkedin.com/in/yiğitözdemir"
                                    target="_blank" rel="noopener noreferrer"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                    title="LinkedIn">
                                    <Linkedin className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                </a>
                                {/* GitHub */}
                                <a href="https://github.com/yigittozdemirr"
                                    target="_blank" rel="noopener noreferrer"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                    title="GitHub">
                                    <Github className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                </a>
                            </div>
                        </div>

                        {/* Link columns */}
                        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
                            <div key={heading}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-4"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}>{heading}</p>
                                <ul className="space-y-2.5">
                                    {links.map(({ label, href }) => (
                                        <li key={label}>
                                            <Link to={href}
                                                className="text-sm transition-colors hover:text-white"
                                                style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                {label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t text-xs"
                        style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' }}>
                        <span>© 2026 DataValidator. All rights reserved.</span>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white/50 transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white/50 transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
