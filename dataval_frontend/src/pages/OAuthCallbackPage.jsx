/**
 * OAuthCallbackPage.jsx
 * ─────────────────────
 * Handles the redirect from the backend after a successful social login.
 *
 * Flow:
 *   Backend → redirect to /auth/callback?token=<jwt>
 *   This page picks up the token, stores it in localStorage, fetches /me,
 *   and navigates the user to /upload (dashboard).
 *
 * If no token is present (e.g. direct navigation) it redirects to /login.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext.jsx';

const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('connecting'); // 'connecting' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setErrorMsg(decodeURIComponent(error));
            return;
        }

        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        // Store token and rehydrate user via AuthContext
        login(token)
            .then(() => navigate('/upload', { replace: true }))
            .catch(() => {
                setStatus('error');
                setErrorMsg('Authentication succeeded but we could not load your profile. Please try again.');
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center"
            style={{ background: '#1a1a14', color: '#fff' }}
        >
            {status === 'connecting' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-6 text-center px-8"
                >
                    {/* Spinner */}
                    <div
                        className="w-14 h-14 rounded-full border-4 animate-spin"
                        style={{
                            borderColor: 'rgba(212,240,61,0.15)',
                            borderTopColor: '#D4F03D',
                        }}
                    />
                    <div>
                        <p className="text-lg font-bold text-white mb-1">Completing sign-in…</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Hang tight while we set up your account.
                        </p>
                    </div>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        A project by Yiğit Özdemir
                    </p>
                </motion.div>
            )}

            {status === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 text-center px-8 max-w-sm"
                >
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                        style={{ background: 'rgba(255,61,0,0.12)', border: '1px solid rgba(255,61,0,0.3)' }}
                    >
                        ✕
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white mb-1">Sign-in failed</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {errorMsg || 'An unexpected error occurred. Please try again.'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/login', { replace: true })}
                        className="mt-2 px-6 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:brightness-110"
                        style={{ background: '#D4F03D' }}
                    >
                        Back to Log In
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default OAuthCallbackPage;
