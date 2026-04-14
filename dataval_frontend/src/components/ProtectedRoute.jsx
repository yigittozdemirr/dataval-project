import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a14' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#D4F03D' }}>
                        <div className="grid grid-cols-2 gap-0.5">
                            {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
                        </div>
                    </div>
                    <div className="w-6 h-6 border-2 border-transparent rounded-full animate-spin"
                        style={{ borderTopColor: '#D4F03D' }} />
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
