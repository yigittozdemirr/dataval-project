import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/AppContext.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LandingPage      from './pages/LandingPage.jsx';
import SignUpPage        from './pages/SignUpPage.jsx';
import LoginPage         from './pages/LoginPage.jsx';
import HomePage          from './pages/HomePage.jsx';
import AnalyzingPage     from './pages/AnalyzingPage.jsx';
import DashboardPage     from './pages/DashboardPage.jsx';
import HistoryPage       from './pages/HistoryPage.jsx';
import SettingsPage      from './pages/SettingsPage.jsx';
import DocsPage          from './pages/DocsPage.jsx';

// ── New public pages ─────────────────────────────────────────────────────────
import DemoPage          from './pages/DemoPage.jsx';
import FeaturesPage      from './pages/FeaturesPage.jsx';
import IntegrationsPage  from './pages/IntegrationsPage.jsx';
import ChangelogPage     from './pages/ChangelogPage.jsx';
import OAuthCallbackPage from './pages/OAuthCallbackPage.jsx';
import ScrollToTop       from './components/ScrollToTop.jsx';

const App = () => (
    <AppProvider>
        <BrowserRouter>
            <ScrollToTop />
            {/* AuthProvider must be inside BrowserRouter so it can call useNavigate */}
            <AuthProvider>
                <Routes>
                    {/* ── Public ── */}
                    <Route path="/"             element={<LandingPage />} />
                    <Route path="/login"        element={<LoginPage />} />
                    <Route path="/signup"       element={<SignUpPage />} />

                    {/* ── Public (no auth required) ── */}
                    <Route path="/docs"         element={<DocsPage />} />
                    <Route path="/demo"         element={<DemoPage />} />
                    <Route path="/features"     element={<FeaturesPage />} />
                    <Route path="/integrations" element={<IntegrationsPage />} />
                    <Route path="/changelog"    element={<ChangelogPage />} />
                    <Route path="/auth/callback" element={<OAuthCallbackPage />} />

                    {/* ── Protected ── */}
                    <Route path="/upload"    element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                    <Route path="/analyzing" element={<ProtectedRoute><AnalyzingPage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                    {/* ── Catch-all ── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </AppProvider>
);

export default App;
