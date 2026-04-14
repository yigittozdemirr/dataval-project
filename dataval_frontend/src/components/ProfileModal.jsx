import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Building2, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { updateProfile, uploadAvatar, API_BASE } from '../lib/api.js';
import SafeAvatar from './SafeAvatar.jsx';

/* ─────────────────────────────────────────────────────────────────────────────
   ProfileModal
   · Renders into document.body via a Portal so it's above everything
   · Framer Motion scale-in / fade-out
   · Instant local preview of selected avatar before uploading
   · Saves profile text + avatar separately; avatar saves immediately on pick
───────────────────────────────────────────────────────────────────────────── */
const ProfileModal = ({ onClose }) => {
    const { user, setUser } = useAuth();

    const [form, setForm] = useState({
        full_name: user?.full_name ?? '',
        organization: user?.organization ?? '',
    });

    /* Local blob URL for instant preview */
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    /* Revoke object URL on unmount to avoid memory leaks */
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    /* Close on Escape */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    /* ── Avatar source (preview > remote > initials) ── */
    const remoteUrl = user?.profile_picture_url
        ? `${API_BASE}${user.profile_picture_url}`
        : null;

    const getInitials = () =>
        (user?.full_name ?? '')
            .split(' ')
            .map(p => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';

    /* ── Pick file → show instant preview → upload to backend ── */
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        /* Instant local preview */
        const blobUrl = URL.createObjectURL(file);
        setPreviewUrl(blobUrl);
        setError('');
        setUploading(true);

        try {
            const res = await uploadAvatar(file);
            setUser(res.data);
        } catch {
            setError('Failed to upload avatar — please try again.');
            setPreviewUrl(null);
        } finally {
            setUploading(false);
        }
    };

    /* ── Save name / org ── */
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await updateProfile(form);
            setUser(res.data);
            setSaved(true);
            setTimeout(() => { setSaved(false); onClose(); }, 900);
        } catch {
            setError('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
    };
    const focusOn = (e) => { e.target.style.borderColor = '#D4F03D'; };
    const focusOff = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; };

    const modal = (
        <AnimatePresence>
            {/* ── Backdrop ── */}
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                {/* ── Modal card ── */}
                <motion.div
                    key="card"
                    initial={{ opacity: 0, scale: 0.88, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, y: 16 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 340, mass: 0.8 }}
                    className="relative w-full max-w-md rounded-2xl overflow-hidden"
                    style={{
                        background: '#161613',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-6 py-4"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <div>
                            <h2 className="font-bold text-white text-base">Update Profile</h2>
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Changes apply instantly to your session
                            </p>
                        </div>
                        <button
                            id="close-profile-modal"
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="px-6 py-5 space-y-5">

                            {/* ── Avatar upload ── */}
                            <div className="flex justify-center">
                                <div className="relative group">
                                    {/* Circle — SafeAvatar handles img-load errors gracefully */}
                                    <div
                                        className="cursor-pointer ring-2 ring-transparent transition-all group-hover:ring-[#D4F03D]/60 rounded-full"
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <SafeAvatar
                                            src={previewUrl ?? remoteUrl}
                                            name={user?.full_name}
                                            size={96}
                                        />
                                    </div>

                                    {/* Hover overlay */}
                                    <div
                                        className="absolute inset-0 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        style={{ background: 'rgba(0,0,0,0.58)' }}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        {uploading
                                            ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            : <>
                                                <Camera className="w-5 h-5 text-white mb-0.5" />
                                                <span className="text-[10px] text-white/80 font-semibold">CHANGE</span>
                                            </>
                                        }
                                    </div>

                                    {/* Camera badge */}
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:brightness-110"
                                        style={{ background: '#D4F03D', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                                    >
                                        <Camera className="w-3.5 h-3.5 text-black" />
                                    </button>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            {/* Preview label */}
                            {previewUrl && (
                                <p className="text-center text-[11px]" style={{ color: '#D4F03D', marginTop: '-8px' }}>
                                    ✓ Preview — will be applied on save
                                </p>
                            )}

                            {/* ── Error ── */}
                            {error && (
                                <div className="p-3 rounded-xl text-sm text-red-400"
                                    style={{ background: 'rgba(255,61,0,0.08)', border: '1px solid rgba(255,61,0,0.2)' }}>
                                    {error}
                                </div>
                            )}

                            {/* ── Full Name ── */}
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-white">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                        style={{ color: 'rgba(255,255,255,0.3)' }} />
                                    <input
                                        value={form.full_name}
                                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                                        placeholder="Your full name"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                        style={inputStyle}
                                        onFocus={focusOn}
                                        onBlur={focusOff}
                                    />
                                </div>
                            </div>

                            {/* ── Organization ── */}
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-white">Organization</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                        style={{ color: 'rgba(255,255,255,0.3)' }} />
                                    <input
                                        value={form.organization}
                                        onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}
                                        placeholder="Your organization"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                        style={inputStyle}
                                        onFocus={focusOn}
                                        onBlur={focusOff}
                                    />
                                </div>
                            </div>

                            {/* ── Email (read-only) ── */}
                            <div>
                                <label className="block text-sm font-semibold mb-1.5"
                                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    Email <span className="text-[10px] font-normal">(read-only)</span>
                                </label>
                                <input
                                    value={user?.email ?? ''}
                                    readOnly
                                    className="w-full px-4 py-3 rounded-xl text-sm cursor-not-allowed outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: 'rgba(255,255,255,0.3)',
                                    }}
                                />
                            </div>
                        </div>

                        {/* ── Footer actions ── */}
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/8"
                                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                            >
                                Cancel
                            </button>
                            <button
                                id="save-profile-btn"
                                type="submit"
                                disabled={saving || saved || uploading}
                                className="flex-1 py-3 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                                style={{
                                    background: saved ? '#22c55e' : '#D4F03D',
                                    boxShadow: saved ? '0 0 20px rgba(34,197,94,0.3)' : '0 0 20px rgba(212,240,61,0.2)',
                                    transition: 'background 0.3s',
                                }}
                            >
                                {saved
                                    ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                                    : saving
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                                        : 'Save Changes'
                                }
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(modal, document.body);
};

export default ProfileModal;
