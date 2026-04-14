import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, BarChart3, CheckCircle2, Shield, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { loginUser } from '../lib/api.js';

/* ── Left panel (same design as SignUpPage) ── */
const LeftPanel = () => (
    <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#111110', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(212,240,61,0.06)' }} />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4F03D' }}>
                <div className="grid grid-cols-2 gap-0.5">
                    {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
                </div>
            </div>
            <span className="font-bold text-white text-base tracking-tight">DataValidator</span>
        </div>

        {/* Copy */}
        <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tight text-white mb-4 leading-tight">
                Welcome back to<br />
                <span style={{ color: '#D4F03D' }}>DataValidator.</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-xs mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Your ML pipeline's first line of defense against data quality issues.
            </p>

            {/* Feature list */}
            {[
                { icon: Shield, text: 'Zero-trust leakage detection' },
                { icon: BarChart3, text: 'Instant EDA reports' },
                { icon: Zap, text: 'Augmentation recommendations' },
            ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(212,240,61,0.12)', border: '1px solid rgba(212,240,61,0.15)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: '#D4F03D' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                </div>
            ))}
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
            {[{ v: '50K+', l: 'Datasets validated' }, { v: '99.9%', l: 'Uptime SLA' }].map(({ v, l }) => (
                <div key={l} className="rounded-xl p-4" style={{ background: '#1a1a14', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl font-black text-white">{v}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</p>
                </div>
            ))}
        </div>

        <p className="text-[11px] relative z-10" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2026 DataValidator Inc.</p>
    </div>
);

/* ── LOGIN PAGE ──────────────────────────────────────────────────────────── */
const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [socialLoading, setSocialLoading] = useState(''); // 'google' | 'github' | ''

    const handleSocialLogin = (provider) => {
        if (socialLoading) return; // prevent double-click
        setSocialLoading(provider);
        // Redirect browser to backend — backend handles OAuth dance and returns JWT via /auth/callback
        window.location.href = `http://localhost:8000/auth/${provider}/login`;
    };

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await loginUser(form);
            await login(res.data.access_token);
            navigate('/upload');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2" style={{ background: '#1a1a14' }}>
            <LeftPanel />

            {/* ── Right panel ─────────────────────────────────────────── */}
            <div className="flex flex-col justify-center px-8 py-12 lg:px-16" style={{ background: '#1f1f18' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    className="w-full max-w-md mx-auto">

                    <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
                    <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Sign in to continue.{' '}
                        <Link to="/signup" className="font-semibold underline" style={{ color: '#D4F03D' }}>Create an account →</Link>
                    </p>

                    {/* OAuth buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {[
                            {
                                id: 'google',
                                label: 'Google',
                                logo: (
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                                    </svg>
                                ),
                            },
                            {
                                id: 'github',
                                label: 'GitHub',
                                logo: (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                ),
                            },
                        ].map(({ id, label, logo }) => (
                            <button
                                key={id}
                                id={`oauth-${id}-login-btn`}
                                onClick={() => handleSocialLogin(id)}
                                disabled={!!socialLoading}
                                className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/8 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.03)' }}
                            >
                                {socialLoading === id
                                    ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" /> Connecting…</>
                                    : <>{logo} {label}</>}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>OR SIGN IN WITH EMAIL</span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-sm text-red-400"
                            style={{ background: 'rgba(255,61,0,0.08)', border: '1px solid rgba(255,61,0,0.25)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-white">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <input name="email" type="email" required value={form.email} onChange={handleChange}
                                    placeholder="name@company.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    onFocus={e => e.target.style.borderColor = '#D4F03D'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-semibold text-white">Password</label>
                                <button type="button" className="text-xs transition-colors hover:text-white"
                                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <input name="password" type={showPw ? 'text' : 'password'} required value={form.password} onChange={handleChange}
                                    placeholder="Your password"
                                    className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    onFocus={e => e.target.style.borderColor = '#D4F03D'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <button type="button" onClick={() => setShowPw(p => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <motion.button type="submit" disabled={loading}
                            whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-black transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                            style={{ background: '#D4F03D', boxShadow: '0 0 24px rgba(212,240,61,0.25)' }}>
                            {loading
                                ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Signing in…</>
                                : 'Log In'}
                        </motion.button>
                    </form>

                    <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-semibold underline" style={{ color: '#D4F03D' }}>Sign up for free</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
