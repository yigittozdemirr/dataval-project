import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings2, ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { API_BASE } from '../lib/api.js';
import ProfileModal from './ProfileModal.jsx';
import SafeAvatar from './SafeAvatar.jsx';

const Logo = () => (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4F03D' }}>
            <div className="grid grid-cols-2 gap-0.5">
                {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
            </div>
        </div>
        <span className="font-bold text-white text-base tracking-tight">Dataset Validator</span>
    </div>
);

/* ── Avatar bubble + dropdown ─────────────────────────────────────────── */
const AvatarMenu = () => {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const menuRef = useRef(null);

    /* close on outside click */
    useEffect(() => {
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Build the avatar URL pointing to the backend — no crossOrigin needed */
    const avatarUrl = user?.profile_picture_url
        ? `${API_BASE}${user.profile_picture_url}`
        : null;

    return (
        <div className="relative" ref={menuRef}>
            {/* Avatar trigger */}
            <button
                id="avatar-menu-btn"
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-1.5 rounded-full p-0.5 transition-all hover:ring-2"
                style={{ ringColor: '#D4F03D' }}
            >
                <SafeAvatar src={avatarUrl} name={user?.full_name} size={36} />
                <ChevronDown className="w-3 h-3 transition-transform duration-200" style={{
                    color: 'rgba(255,255,255,0.4)',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="dropdown"
                        initial={{ opacity: 0, scale: 0.92, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -8 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                        className="absolute right-0 top-12 w-60 rounded-2xl overflow-hidden z-50"
                        style={{
                            background: '#252520',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* User header */}
                        <div className="px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-3">
                                <SafeAvatar src={avatarUrl} name={user?.full_name} size={36} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Unknown'}</p>
                                    <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {user?.organization || user?.email || ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Menu items */}
                        <div className="p-1.5">
                            <button
                                id="update-profile-btn"
                                onClick={() => { setOpen(false); setShowModal(true); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/6 text-left"
                                style={{ color: 'rgba(255,255,255,0.7)' }}
                            >
                                <Settings2 className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                Update Profile
                            </button>

                            <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.07)' }} />

                            <button
                                id="logout-btn"
                                onClick={() => { setOpen(false); logout(); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-red-500/10 text-left"
                                style={{ color: '#FF6B6B' }}
                            >
                                <LogOut className="w-4 h-4 shrink-0" />
                                Log Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Modal */}
            {showModal && <ProfileModal onClose={() => setShowModal(false)} />}
        </div>
    );
};

/* ── NavBar ──────────────────────────────────────────────────────────────── */
const NavBar = ({ variant = 'default' }) => {
    const loc = useLocation();
    const { user } = useAuth();

    const publicLinks = [
        { to: '/features', label: 'Features' },
        { to: '/demo', label: 'Demo' },
        { to: '/docs', label: 'Docs' },
    ];

    const privateLinks = [
        { to: '/upload', label: 'Dashboard' },
        { to: '/history', label: 'History' },
        { to: '/settings', label: 'Settings' },
        { to: '/docs', label: 'Docs' },
    ];

    // Auth takes priority: logged-in → private links, otherwise fall back to variant prop
    const links = user ? privateLinks : (variant === 'public' ? publicLinks : privateLinks);

    /* ── Right section: auth-aware ─────────────────────────────────── */
    const RightSection = () => {
        if (user) return <AvatarMenu />;
        if (variant === 'public') return (
            <div className="flex items-center gap-3">
                <Link
                    to="/login"
                    className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    Log In
                </Link>
                <Link
                    to="/signup"
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-black transition-all hover:brightness-110 active:scale-95"
                    style={{ background: '#D4F03D' }}
                >
                    Sign Up
                </Link>
            </div>
        );
        return (
            <Link
                to="/login"
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            >
                ?
            </Link>
        );
    };

    return (
        <nav
            className="sticky top-0 z-50 border-b backdrop-blur-sm"
            style={{ background: 'rgba(17,17,16,0.92)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
            {/* ── 3-column grid: Logo | Center Links | Actions ── */}
            <div className="grid px-8 py-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

                {/* LEFT — Logo */}
                <div className="flex items-center">
                    <Link to={user ? '/upload' : '/'}>
                        <Logo />
                    </Link>
                </div>

                {/* CENTER — Nav links (always perfectly centered) */}
                <div className="flex items-center gap-8">
                    {links.map(({ to, label }) => {
                        const active = loc.pathname === to
                            || (to === '/upload' && loc.pathname === '/');
                        return (
                            <Link
                                key={to}
                                to={to}
                                className="text-sm font-medium transition-colors duration-150 hover:text-white"
                                style={{ color: active ? '#D4F03D' : 'rgba(255,255,255,0.45)' }}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>

                {/* RIGHT — Auth actions */}
                <div className="flex items-center justify-end">
                    <RightSection />
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
