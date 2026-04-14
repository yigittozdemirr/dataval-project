import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Building2, Lock, CheckCircle2, BarChart3 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { registerUser, loginUser } from '../lib/api.js';

/* ── Shared password strength meter ── */
const getStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: 'transparent' };
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const map = [
        { label: '', color: 'transparent' },
        { label: 'Weak', color: '#FF3D00' },
        { label: 'Fair', color: '#ffa000' },
        { label: 'Medium', color: '#D4F03D' },
        { label: 'Strong', color: '#00E0FF' },
    ];
    return { score: s, ...map[s] };
};

/* ── Left marketing panel ── */
const LeftPanel = () => (
    <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#111110', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(212,240,61,0.08)' }} />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4F03D' }}>
                <div className="grid grid-cols-2 gap-0.5">
                    {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
                </div>
            </div>
            <span className="font-bold text-white text-base tracking-tight">DataValidator</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#D4F03D' }}>Data Quality Hub</p>
            <h2 className="text-4xl font-black tracking-tight text-white mb-4 leading-tight">
                Ensure leakage-free<br />models{' '}
                <span style={{ color: '#D4F03D' }}>instantly.</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Join thousands of data scientists who trust DataValidator for perfect class distribution and advanced EDA tools.
            </p>
        </div>

        {/* Mock dashboard card */}
        <div className="relative z-10 rounded-2xl p-5" style={{ background: '#1a1a14', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
            </div>
            {/* mini bar chart */}
            <div className="flex items-end gap-2 h-20 mb-4">
                {[35, 55, 45, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-md"
                        style={{ height: `${h}%`, background: i === 1 ? '#D4F03D' : i === 3 ? '#D4F03D88' : 'rgba(212,240,61,0.25)' }} />
                ))}
            </div>
            {[90, 70].map((w, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#D4F03D' }} />
                    <div className="h-2 rounded-full flex-1" style={{ background: 'rgba(255,255,255,0.08)', maxWidth: `${w}%` }}>
                        <div className="h-full rounded-full" style={{ width: '100%', background: 'rgba(255,255,255,0.15)' }} />
                    </div>
                </div>
            ))}
            {/* Verified badge */}
            <div className="flex items-center gap-2.5 mt-4 p-2.5 rounded-xl"
                style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#D4F03D' }}>
                    <BarChart3 className="w-3.5 h-3.5 text-black" />
                </div>
            </div>
        </div>

        <p className="text-[11px] relative z-10" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2026 DataValidator Inc.</p>
    </div>
);

/* ── SIGN UP PAGE ─────────────────────────────────────────────────────────── */
const SignUpPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ full_name: '', email: '', organization: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [socialLoading, setSocialLoading] = useState(''); // 'google' | 'github' | ''

    const handleSocialLogin = (provider) => {
        if (socialLoading) return;
        setSocialLoading(provider);
        window.location.href = `http://localhost:8000/auth/${provider}/login`;
    };

    const strength = getStrength(form.password);

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agreed) { setError('Please agree to the Terms of Service.'); return; }
        setLoading(true); setError('');
        try {
            await registerUser(form);
            const loginRes = await loginUser({ email: form.email, password: form.password });
            await login(loginRes.data.access_token);
            navigate('/upload');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
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

                    <h1 className="text-3xl font-black text-white mb-2">Create account</h1>
                    <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Start validating your datasets today. Already have an account?{' '}
                        <Link to="/login" className="font-semibold underline" style={{ color: '#D4F03D' }}>Log in</Link>
                    </p>

                    {/* OAuth buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {[
                            {
                                id: 'google',
                                label: 'Google',
                                logo: (
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
                                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
                                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
                                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
                                    </svg>
                                ),
                            },
                            {
                                id: 'github',
                                label: 'GitHub',
                                logo: (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                    </svg>
                                ),
                            },
                        ].map(({ id, label, logo }) => (
                            <button
                                key={id}
                                id={`oauth-${id}-signup-btn`}
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
                        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>OR REGISTER WITH EMAIL</span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-sm text-red-400"
                            style={{ background: 'rgba(255,61,0,0.08)', border: '1px solid rgba(255,61,0,0.25)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-white">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <input name="full_name" required value={form.full_name} onChange={handleChange}
                                    placeholder="e.g. Jane Doe"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-1"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', focusRingColor: '#D4F03D' }}
                                    onFocus={e => e.target.style.borderColor = '#D4F03D'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>

                        {/* Work Email */}
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-white">Work Email</label>
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

                        {/* Organization */}
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-white">Organization</label>
                            <div className="relative">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <input name="organization" value={form.organization} onChange={handleChange}
                                    placeholder="Your Company Ltd."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    onFocus={e => e.target.style.borderColor = '#D4F03D'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-white">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <input name="password" type={showPw ? 'text' : 'password'} required value={form.password} onChange={handleChange}
                                    placeholder="Create a strong password"
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
                            {/* Strength meter */}
                            {form.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 h-1 mb-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex-1 rounded-full transition-all duration-300"
                                                style={{ background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-right" style={{ color: strength.color }}>{strength.label} strength</p>
                                </div>
                            )}
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <div className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                style={{
                                    background: agreed ? '#D4F03D' : 'transparent',
                                    borderColor: agreed ? '#D4F03D' : 'rgba(255,255,255,0.25)',
                                }}
                                onClick={() => setAgreed(p => !p)}>
                                {agreed && <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 12 12">
                                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>}
                            </div>
                            <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                I agree to the{' '}
                                <span className="underline cursor-pointer" style={{ color: '#D4F03D' }}>Terms of Service</span>
                                {' '}and{' '}
                                <span className="underline cursor-pointer" style={{ color: '#D4F03D' }}>Privacy Policy</span>.
                            </span>
                        </label>

                        {/* Submit */}
                        <motion.button type="submit" disabled={loading}
                            whileHover={{ brightness: 1.1 }} whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-black transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: '#D4F03D', boxShadow: '0 0 24px rgba(212,240,61,0.25)' }}>
                            {loading
                                ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating Account…</>
                                : 'Create Account'}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default SignUpPage;
