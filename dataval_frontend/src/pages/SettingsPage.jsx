import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '../components/NavBar.jsx';
import { Save, Bell, Shield, Sliders, CheckCircle, RotateCcw, FileText, HardDrive } from 'lucide-react';

/* ── Key names in localStorage ── */
const LS_KEY = 'dataval_settings';

/* ── Default settings ── */
const DEFAULTS = {
    // Analysis
    autoDetectTarget: true,
    leakageThreshold: 0.98,
    deepLeakageScan: false,
    maxFileSizeMB: 500,
    // Export
    reportFormat: 'pdf',
    // Notifications
    analysisCompleteToast: true,
    criticalIssueAlerts: true,
    // Privacy & Data
    storeHistoryLocally: true,
    autoDeleteStagedFiles: true,
};

const load = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
};

/* ── Controlled toggle row ── */
const ToggleRow = ({ label, sub, value, onChange }) => (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
        </div>
        <button
            onClick={() => onChange(!value)}
            className="relative w-11 h-6 rounded-full transition-all duration-200"
            style={{ background: value ? '#D4F03D' : 'rgba(255,255,255,0.1)' }}
        >
            <div className="absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-200"
                style={{ left: value ? '24px' : '4px' }} />
        </button>
    </div>
);

/* ── Number input row ── */
const NumberRow = ({ label, sub, value, onChange, min, max, step = 1, unit = '' }) => (
    <div className="py-4 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={value}
                    min={min} max={max} step={step}
                    onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= min && v <= max) onChange(v);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-mono text-white w-24 outline-none focus:ring-1 text-right"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                    }}
                />
                {unit && <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{unit}</span>}
            </div>
        </div>
        {/* Slider for leakage threshold */}
        {step < 1 && (
            <div className="mt-3">
                <input
                    type="range"
                    min={min} max={max} step={step}
                    value={value}
                    onChange={e => onChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, #D4F03D 0%, #D4F03D ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <span>{min}</span>
                    <span className="font-bold" style={{ color: '#D4F03D' }}>{value}</span>
                    <span>{max}</span>
                </div>
            </div>
        )}
    </div>
);

/* ── Select row ── */
const SelectRow = ({ label, sub, value, onChange, options }) => (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
        </div>
        <div className="flex gap-2">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={value === opt.value
                        ? { background: '#D4F03D', color: '#000' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

const Section = ({ icon: Icon, title, children }) => (
    <div className="rounded-xl border p-6 mb-5" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(212,240,61,0.12)' }}>
                <Icon className="w-4 h-4" style={{ color: '#D4F03D' }} />
            </div>
            <h2 className="font-bold text-white">{title}</h2>
        </div>
        {children}
    </div>
);

const SettingsPage = () => {
    const [settings, setSettings] = useState(load);
    const [saved, setSaved] = useState(false);

    const set = useCallback((key, val) => setSettings(prev => ({ ...prev, [key]: val })), []);

    const handleSave = () => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(settings));
            window.dispatchEvent(new CustomEvent('dataval-settings-changed', { detail: settings }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2800);
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const handleReset = () => {
        setSettings({ ...DEFAULTS });
        localStorage.setItem(LS_KEY, JSON.stringify(DEFAULTS));
        window.dispatchEvent(new CustomEvent('dataval-settings-changed', { detail: DEFAULTS }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2800);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: 'white' }}>
            <NavBar />
            <main className="flex-1 px-10 py-10 max-w-3xl w-full mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Configure your DataValidator workspace
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-white/5 active:scale-95"
                            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:brightness-105 active:scale-95"
                            style={{ background: '#D4F03D' }}
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                </div>

                <Section icon={Sliders} title="Analysis Preferences">
                    <ToggleRow
                        label="Auto-detect target column"
                        sub="Automatically infer the target variable from column names and data patterns"
                        value={settings.autoDetectTarget}
                        onChange={v => set('autoDetectTarget', v)}
                    />
                    <NumberRow
                        label="Leakage threshold"
                        sub="Flag columns with correlation above this value as potential leakage"
                        value={settings.leakageThreshold}
                        onChange={v => set('leakageThreshold', v)}
                        min={0.80} max={1.00} step={0.01}
                    />
                    <ToggleRow
                        label="Deep leakage scan"
                        sub="Run all-pairs correlation analysis (slower but more thorough for large datasets)"
                        value={settings.deepLeakageScan}
                        onChange={v => set('deepLeakageScan', v)}
                    />
                    <NumberRow
                        label="Max file size"
                        sub="Maximum upload size — files exceeding this limit will be rejected"
                        value={settings.maxFileSizeMB}
                        onChange={v => set('maxFileSizeMB', v)}
                        min={10} max={5000} step={10}
                        unit="MB"
                    />
                </Section>

                <Section icon={FileText} title="Export">
                    <SelectRow
                        label="Report format"
                        sub="Choose the format for downloaded validation reports"
                        value={settings.reportFormat}
                        onChange={v => set('reportFormat', v)}
                        options={[
                            { value: 'pdf', label: 'PDF' },
                            { value: 'json', label: 'JSON' },
                        ]}
                    />
                </Section>

                <Section icon={Bell} title="Notifications">
                    <ToggleRow
                        label="Analysis complete toast"
                        sub="Show a notification banner when an analysis finishes"
                        value={settings.analysisCompleteToast}
                        onChange={v => set('analysisCompleteToast', v)}
                    />
                    <ToggleRow
                        label="Critical issue alerts"
                        sub="Highlight high-severity findings (leakage, corruption) immediately"
                        value={settings.criticalIssueAlerts}
                        onChange={v => set('criticalIssueAlerts', v)}
                    />
                </Section>

                <Section icon={Shield} title="Privacy & Data">
                    <ToggleRow
                        label="Store history locally"
                        sub="Keep analysis summaries on the server for the History page"
                        value={settings.storeHistoryLocally}
                        onChange={v => set('storeHistoryLocally', v)}
                    />
                    <ToggleRow
                        label="Auto-delete staged files"
                        sub="Remove uploaded files from disk automatically after analysis completes"
                        value={settings.autoDeleteStagedFiles}
                        onChange={v => set('autoDeleteStagedFiles', v)}
                    />
                </Section>
            </main>

            {/* ── Success toast ── */}
            <AnimatePresence>
                {saved && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl z-50 shadow-2xl"
                        style={{ background: '#D4F03D', color: '#000' }}
                    >
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-bold">Settings saved successfully</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ── Export a helper so other components can read settings at any time ── */
export const readSettings = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
};

export default SettingsPage;
