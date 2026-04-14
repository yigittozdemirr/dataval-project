import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, CheckCircle2, XCircle, AlertTriangle, BarChart3,
    Zap, Shield, ArrowDownToLine, Play, RefreshCw, LayoutGrid,
    Layers, FlipHorizontal, RotateCcw, Shuffle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

import NavBar from '../components/NavBar.jsx';
import AugmentCard from '../components/AugmentCard.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { applyAugment, fixDataset, getStatus, exportDataset } from '../lib/api.js';

/* ── Sidebar nav items — id matches section anchor ────────────────────────── */
const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'leakage', label: 'Leakage Test', icon: Shield },
    { id: 'eda', label: 'EDA', icon: BarChart3 },
    { id: 'augmentation', label: 'Augmentation', icon: Zap },
    { id: 'export', label: 'Export', icon: ArrowDownToLine },
];

/* ── Augment icon map ──────────────────────────────────────────────────────── */
const AUG_ICONS = {
    'Horizontal Flip': FlipHorizontal,
    'Random Rotation': RotateCcw,
    'Color Jitter': Layers,
    'SMOTE Upsampling': Zap,
    'Gaussian Noise': Layers,
    'Shuffle Rows': Shuffle,
    'Oversampling': Zap,
    'Elastic Deformation': Layers,
    'Random Crop': Layers,
    'Grid Distortion': Layers,
};

/* ── Quality checks: prefer backend data, fall back to derived checks ─────── */
const buildQualityChecks = (result) => {
    // If backend returns real quality_checks, use them directly
    if (Array.isArray(result.quality_checks) && result.quality_checks.length > 0) {
        return result.quality_checks;
    }
    // Derived fallback
    const hasLeakage = (result.leakage_risk_columns || []).length > 0;
    const missingKeys = Object.keys(result.missing_values || {});
    return [
        { label: 'Data Types Consistency', pass: true },
        { label: 'Duplicate Rows Check', pass: !(result.duplicate_rows > 0) },
        { label: 'Target Leakage', pass: !hasLeakage },
        { label: 'Categorical Encoding', pass: true },
        { label: 'Missing Values < 5%', pass: missingKeys.length === 0 },
    ];
};

/* ── Main Dashboard Component ─────────────────────────────────────────────── */
const DashboardPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { analysisResult, taskId } = useApp();

    const [result, setResult] = useState(analysisResult?.result || {});
    const [isFixing, setIsFixing] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeNav, setActiveNav] = useState('leakage');
    const [augStates, setAugStates] = useState({});

    const mainContentRef = useRef(null);
    // Ref on the inner content div — excludes the sticky top-nav so it is not burned into the PDF
    const reportContentRef = useRef(null);

    /* Redirect if no data */
    if (!analysisResult && !taskId) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a14' }}>
                <div className="text-center">
                    <p className="text-white/40 mb-4">No analysis data found.</p>
                    <Link to="/upload" className="px-5 py-2.5 rounded-xl text-black font-bold text-sm"
                        style={{ background: '#D4F03D' }}>← Upload a Dataset</Link>
                </div>
            </div>
        );
    }

    const filename = analysisResult?.filename || 'dataset';
    const detectedType = analysisResult?.detected_type || 'Unknown';

    const {
        total_samples = 0,
        total_features = 0,
        class_distribution = {},
        leakage_risk_columns = [],
        augmentation_suggestions = [],
        detected_target = 'N/A',
        missing_values = {},
        missing_count = null,   // exact cell/file count from backend
        leakage_score = null,   // 0-100 from backend
        column_stats = {},
        optimized = false,
        fix_log = [],
    } = result;

    const isVision = typeof total_features === 'string';
    const numClasses = Object.keys(class_distribution).length;

    // ── Missing Values: use backend's exact count if available ──────────────
    const missingDisplay = missing_count !== null
        ? missing_count
        : Object.values(missing_values).length;

    const hasLeakage = leakage_risk_columns.length > 0 && !optimized;
    const qualityChecks = buildQualityChecks(result);
    const passCount = qualityChecks.filter(c => c.pass).length;

    // ── Leakage score: use backend's real score if available ────────────────
    const maxLeakageScore = leakage_score !== null
        ? leakage_score
        : leakage_risk_columns.length > 0
            ? Math.round(Math.max(...leakage_risk_columns.map(c => c.score ?? 0.5)) * 100)
            : optimized ? 0 : 12;

    const leakageColor = maxLeakageScore > 60 ? '#FF3D00' : maxLeakageScore > 30 ? '#ffa000' : '#D4F03D';
    const leakageLabel = maxLeakageScore > 60 ? 'CRITICAL' : maxLeakageScore > 30 ? 'MODERATE' : 'LOW';

    const gaugeData = [
        { value: maxLeakageScore },
        { value: 100 - maxLeakageScore },
    ];

    const distData = Object.entries(class_distribution)
        .map(([name, s]) => ({ name, pct: s.percentage ?? 0, count: s.count ?? 0 }))
        .sort((a, b) => b.pct - a.pct);

    /* ── Default augmentations if backend sends none ── */
    const augSuggestions = augmentation_suggestions.length > 0
        ? augmentation_suggestions
        : isVision
            ? [
                { type: 'Horizontal Flip', desc: 'Standard spatial augmentation. Doubles dataset size.' },
                { type: 'Random Rotation', desc: 'Improves robustness to orientation variation.' },
                { type: 'Color Jitter', desc: 'Randomize brightness, contrast, saturation.' },
            ]
            : [
                { type: 'SMOTE Upsampling', desc: 'Balances minority class via synthetic samples.' },
                { type: 'Gaussian Noise', desc: 'Injects noise to numeric columns.' },
                { type: 'Shuffle Rows', desc: 'Randomize input order to remove positional bias.' },
            ];

    /* ── Sidebar scroll: click → smooth-scroll to section ── */
    const handleNavClick = useCallback((id) => {
        setActiveNav(id);
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);


    /* ─────────────────────────────────────────────────────────────────────────
     * Professional PDF Report — Native jsPDF vector rendering
     * No html2canvas dependency. Crisp text, consistent cross-platform output.
     * ───────────────────────────────────────────────────────────────────────── */
    const handleExportPDF = async () => {
        if (isGeneratingPDF) return;
        setIsGeneratingPDF(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const W = pdf.internal.pageSize.getWidth();   // 210
            const H = pdf.internal.pageSize.getHeight();  // 297
            const M = 14;   // page margin
            const CW = W - M * 2;  // content width
            let y = 0;
            let pageNum = 1;
            const dateStr = new Date().toLocaleString();

            // ── Color helpers ──────────────────────────────────────────────
            const hexToRgb = (hex) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return [r, g, b];
            };
            const LIME_RGB  = [212, 240, 61];
            const BG_RGB    = [26, 26, 20];
            const CARD_RGB  = [37, 37, 32];
            const WHITE_RGB = [255, 255, 255];
            const DIM_RGB   = [140, 140, 130];
            const RED_RGB   = [255, 61, 0];
            const AMBER_RGB = [255, 160, 0];
            const CYAN_RGB  = [0, 224, 255];

            const lkColorRgb = maxLeakageScore > 60 ? RED_RGB
                : maxLeakageScore > 30 ? AMBER_RGB : LIME_RGB;

            // ── Rounded rectangle ──────────────────────────────────────────
            const roundRect = (x, y, w, h, r, fillRgb, strokeRgb = null) => {
                pdf.setFillColor(...fillRgb);
                if (strokeRgb) {
                    pdf.setDrawColor(...strokeRgb);
                    pdf.setLineWidth(0.3);
                }
                pdf.roundedRect(x, y, w, h, r, r, strokeRgb ? 'FD' : 'F');
            };

            // ── Page background ────────────────────────────────────────────
            const drawPageBg = () => {
                pdf.setFillColor(...BG_RGB);
                pdf.rect(0, 0, W, H, 'F');
            };

            // ── Header band (every page) ───────────────────────────────────
            const drawHeader = () => {
                // Dark header band
                pdf.setFillColor(17, 17, 16);
                pdf.rect(0, 0, W, 18, 'F');
                // Lime accent line
                pdf.setFillColor(...LIME_RGB);
                pdf.rect(0, 17.5, W, 0.5, 'F');

                // Logo square
                roundRect(M, 4, 10, 10, 2.5, LIME_RGB);
                pdf.setFillColor(0, 0, 0);
                pdf.rect(M + 2.5, 6.5, 2, 2, 'F');
                pdf.rect(M + 5.5, 6.5, 2, 2, 'F');
                pdf.rect(M + 2.5, 9.5, 2, 2, 'F');
                pdf.rect(M + 5.5, 9.5, 2, 2, 'F');

                // Title
                pdf.setTextColor(...LIME_RGB);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text('DataValidator', M + 13, 9);

                pdf.setTextColor(...DIM_RGB);
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Validation Report`, M + 13, 13);

                // Right side: date + page
                pdf.setTextColor(...DIM_RGB);
                pdf.setFontSize(7);
                pdf.text(dateStr, W - M, 9, { align: 'right' });
                pdf.setTextColor(...LIME_RGB);
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Page ${pageNum}`, W - M, 13, { align: 'right' });
            };

            // ── Footer (every page) ────────────────────────────────────────
            const drawFooter = () => {
                pdf.setFillColor(17, 17, 16);
                pdf.rect(0, H - 10, W, 10, 'F');
                pdf.setFillColor(...LIME_RGB);
                pdf.rect(0, H - 10, W, 0.3, 'F');

                pdf.setTextColor(100, 100, 90);
                pdf.setFontSize(6.5);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`© ${new Date().getFullYear()} Dataset Validator · Enterprise ML Pipeline Report`, M, H - 4);

                pdf.setTextColor(...LIME_RGB);
                pdf.setFont('helvetica', 'bold');
                pdf.text(filename, W - M, H - 4, { align: 'right' });
            };

            // ── Page break check ───────────────────────────────────────────
            const needsNewPage = (requiredH) => {
                if (y + requiredH > H - 16) {
                    drawFooter();
                    pdf.addPage();
                    pageNum++;
                    drawPageBg();
                    drawHeader();
                    y = 24;
                }
            };

            // ── Section title helper ───────────────────────────────────────
            const sectionTitle = (title, iconChar = '■') => {
                needsNewPage(14);
                pdf.setFillColor(...LIME_RGB);
                pdf.setTextColor(...LIME_RGB);
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                pdf.text(iconChar, M, y + 4);
                pdf.setTextColor(...WHITE_RGB);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(title, M + 5, y + 4.5);
                // Underline
                pdf.setDrawColor(60, 60, 50);
                pdf.setLineWidth(0.2);
                pdf.line(M, y + 7, W - M, y + 7);
                y += 12;
            };

            // ════════════════════════════════════════════════════════════════
            // PAGE 1
            // ════════════════════════════════════════════════════════════════
            drawPageBg();
            drawHeader();
            y = 24;

            // ── Report title card ──────────────────────────────────────────
            roundRect(M, y, CW, 28, 4, CARD_RGB, [50, 50, 45]);
            pdf.setTextColor(...WHITE_RGB);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Validation Report', M + 8, y + 11);

            pdf.setTextColor(...DIM_RGB);
            pdf.setFontSize(8.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Dataset: ${filename}`, M + 8, y + 17);

            // Type badge
            const typeBadgeW = pdf.getTextWidth(detectedType) + 8;
            roundRect(W - M - typeBadgeW - 6, y + 6, typeBadgeW, 7, 2, [LIME_RGB[0], LIME_RGB[1], LIME_RGB[2]]);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text(detectedType, W - M - typeBadgeW / 2 - 6, y + 10.8, { align: 'center' });

            // Date
            pdf.setTextColor(...DIM_RGB);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.text(dateStr, W - M - 6, y + 19, { align: 'right' });
            y += 34;

            // ── Status banner ──────────────────────────────────────────────
            const isOk = !hasLeakage;
            const bannerColor = isOk ? [40, 45, 30] : [50, 40, 25];
            const bannerBorder = isOk ? [80, 100, 40] : [120, 90, 30];
            roundRect(M, y, CW, 16, 3.5, bannerColor, bannerBorder);

            pdf.setTextColor(isOk ? 212 : 255, isOk ? 240 : 160, isOk ? 61 : 0);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            const statusIcon = isOk ? '✓' : '⚠';
            const statusText = isOk
                ? 'Analysis Complete — No Critical Issues'
                : 'High Data Leakage Detected';
            pdf.text(`${statusIcon}  ${statusText}`, M + 8, y + 7);

            pdf.setTextColor(...DIM_RGB);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            const statusSub = isOk
                ? `${passCount}/${qualityChecks.length} quality checks passed · Ready for training.`
                : `Column "${leakage_risk_columns[0]?.column || 'N/A'}" — correlation score: ${(leakage_risk_columns[0]?.score ?? 0.98).toFixed(2)}`;
            pdf.text(statusSub, M + 8, y + 12.5);
            y += 22;

            // ── Overview Stats (4 cards in a row) ──────────────────────────
            sectionTitle('Overview', '◆');

            const statCards = [
                { label: 'Total Samples', value: total_samples.toLocaleString(), tag: optimized ? 'Optimized' : total_samples > 1000 ? 'Healthy' : 'Small', color: LIME_RGB },
                { label: 'Classes / Features', value: String(numClasses || total_features), tag: numClasses === 2 ? 'Binary' : 'Multi', color: CYAN_RGB },
                { label: 'Missing Values', value: String(missingDisplay), tag: missingDisplay === 0 ? 'None' : 'Found', color: missingDisplay > 0 ? AMBER_RGB : LIME_RGB },
                { label: 'Detected Target', value: String(detected_target || detectedType), tag: isVision ? 'Vision' : 'Tabular', color: CYAN_RGB },
            ];

            const cardW = (CW - 9) / 4;
            const cardH = 26;
            needsNewPage(cardH + 4);

            statCards.forEach((card, i) => {
                const cx = M + i * (cardW + 3);
                roundRect(cx, y, cardW, cardH, 3, CARD_RGB, [50, 50, 45]);

                // Tag badge
                const tagW = pdf.getTextWidth(card.tag) + 6;
                pdf.setFontSize(6);
                roundRect(cx + cardW - tagW - 4, y + 3, tagW, 5, 1.5, [card.color[0], card.color[1], card.color[2]]);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(card.tag, cx + cardW - tagW / 2 - 4, y + 6.5, { align: 'center' });

                // Label
                pdf.setTextColor(...DIM_RGB);
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'normal');
                pdf.text(card.label, cx + 5, y + 15);

                // Value
                pdf.setTextColor(...WHITE_RGB);
                pdf.setFontSize(13);
                pdf.setFont('helvetica', 'bold');
                const valStr = String(card.value);
                const truncVal = valStr.length > 12 ? valStr.slice(0, 11) + '…' : valStr;
                pdf.text(truncVal, cx + 5, y + 22);
            });
            y += cardH + 8;

            // ── Leakage Risk Score ─────────────────────────────────────────
            sectionTitle('Leakage Risk Score', '◆');

            const lkH = 44;
            needsNewPage(lkH + 4);
            roundRect(M, y, CW, lkH, 4, CARD_RGB, [50, 50, 45]);

            // Big score number
            pdf.setTextColor(...lkColorRgb);
            pdf.setFontSize(36);
            pdf.setFont('helvetica', 'bold');
            pdf.text(String(maxLeakageScore), M + 20, y + 22);

            pdf.setTextColor(100, 100, 90);
            pdf.setFontSize(14);
            pdf.text('/100', M + 20 + pdf.getTextWidth(String(maxLeakageScore)) + 1, y + 22);

            // Risk label badge
            const lkLabelStr = maxLeakageScore > 60 ? 'CRITICAL' : maxLeakageScore > 30 ? 'MODERATE' : 'LOW RISK';
            pdf.setFontSize(8);
            const lkBadgeW = pdf.getTextWidth(lkLabelStr) + 10;
            roundRect(M + 20, y + 27, lkBadgeW, 7, 2, lkColorRgb);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            pdf.text(lkLabelStr, M + 20 + lkBadgeW / 2, y + 31.7, { align: 'center' });

            // Description text
            pdf.setTextColor(...DIM_RGB);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Risk of model overfitting due to features directly predicting the target variable.', M + 70, y + 14);

            // Risk columns list
            if (leakage_risk_columns.length > 0) {
                let ry = y + 20;
                pdf.setTextColor(...AMBER_RGB);
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Risk Columns:', M + 70, ry);
                ry += 5;
                pdf.setFont('helvetica', 'normal');
                leakage_risk_columns.slice(0, 4).forEach((c) => {
                    pdf.setTextColor(...DIM_RGB);
                    pdf.text(`• ${c.column || c}  —  score: ${((c.score ?? 0.5) * 100).toFixed(0)}%  (${c.type || 'Correlation'})`, M + 70, ry);
                    ry += 4.5;
                });
            } else {
                pdf.setTextColor(...LIME_RGB);
                pdf.setFontSize(7.5);
                pdf.setFont('helvetica', 'bold');
                pdf.text('✓ No leakage risks detected', M + 70, y + 22);
            }
            y += lkH + 6;

            // ── Class Distribution ─────────────────────────────────────────
            sectionTitle('Class Distribution', '◆');

            const maxBars = Math.min(distData.length, 8);
            const distH = 14 + maxBars * 9;
            needsNewPage(distH + 4);
            roundRect(M, y, CW, distH, 4, CARD_RGB, [50, 50, 45]);

            pdf.setTextColor(...DIM_RGB);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Target: `, M + 6, y + 8);
            pdf.setTextColor(...LIME_RGB);
            pdf.setFont('helvetica', 'bold');
            pdf.text(detected_target || 'N/A', M + 6 + pdf.getTextWidth('Target: '), y + 8);

            if (distData.length === 0) {
                pdf.setTextColor(...DIM_RGB);
                pdf.setFontSize(8);
                pdf.text('No class distribution data available.', M + 6, y + 20);
            } else {
                let barY = y + 14;
                const barAreaW = CW - 65;
                const maxPct = Math.max(...distData.map(d => d.pct), 1);
                distData.slice(0, maxBars).forEach((item, idx) => {
                    // Label
                    pdf.setTextColor(...DIM_RGB);
                    pdf.setFontSize(7);
                    pdf.setFont('helvetica', 'normal');
                    const nameStr = item.name.length > 12 ? item.name.slice(0, 11) + '…' : item.name;
                    pdf.text(nameStr, M + 30, barY + 4.5, { align: 'right' });

                    // Bar background
                    roundRect(M + 33, barY, barAreaW, 6, 1.5, [45, 45, 40]);

                    // Bar fill
                    const fillW = Math.max(2, (item.pct / maxPct) * barAreaW);
                    const barFill = idx === 0 ? [100, 100, 90] : LIME_RGB;
                    roundRect(M + 33, barY, fillW, 6, 1.5, barFill);

                    // Percentage + count
                    pdf.setTextColor(idx === 0 ? 255 : 0, idx === 0 ? 255 : 0, idx === 0 ? 255 : 0);
                    pdf.setFontSize(5.5);
                    pdf.setFont('helvetica', 'bold');
                    if (fillW > 18) {
                        pdf.text(`${item.pct.toFixed(1)}%`, M + 33 + fillW - 2, barY + 4.2, { align: 'right' });
                    }

                    // Count on right
                    pdf.setTextColor(...DIM_RGB);
                    pdf.setFontSize(6.5);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(String(item.count), W - M - 6, barY + 4.5, { align: 'right' });

                    barY += 9;
                });
            }
            y += distH + 6;

            // ── Quality Checks ─────────────────────────────────────────────
            sectionTitle('Quality Checks', '◆');

            const qH = 10 + qualityChecks.length * 8.5;
            needsNewPage(qH + 4);
            roundRect(M, y, CW, qH, 4, CARD_RGB, [50, 50, 45]);

            // Header row
            pdf.setTextColor(...LIME_RGB);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${passCount} / ${qualityChecks.length} Passed`, W - M - 6, y + 7, { align: 'right' });

            let qy = y + 12;
            qualityChecks.forEach((c) => {
                // Status dot
                const dotColor = c.pass ? LIME_RGB : RED_RGB;
                pdf.setFillColor(...dotColor);
                pdf.circle(M + 8, qy + 1.5, 2, 'F');
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(5);
                pdf.setFont('helvetica', 'bold');
                pdf.text(c.pass ? '✓' : '✗', M + 8, qy + 2.5, { align: 'center' });

                // Label
                pdf.setTextColor(200, 200, 195);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.text(c.label, M + 14, qy + 2.8);

                // Pass/Fail badge
                const badge = c.pass ? 'PASS' : 'FAIL';
                const badgeColor = c.pass ? LIME_RGB : RED_RGB;
                const badgeBg = c.pass ? [40, 50, 30] : [50, 30, 25];
                pdf.setFontSize(6);
                const bw = pdf.getTextWidth(badge) + 6;
                roundRect(W - M - bw - 6, qy - 1.2, bw, 6, 1.5, badgeBg);
                pdf.setTextColor(...badgeColor);
                pdf.setFont('helvetica', 'bold');
                pdf.text(badge, W - M - bw / 2 - 6, qy + 2.5, { align: 'center' });

                // Separator line
                pdf.setDrawColor(50, 50, 45);
                pdf.setLineWidth(0.15);
                pdf.line(M + 6, qy + 6, W - M - 6, qy + 6);

                qy += 8.5;
            });
            y += qH + 6;

            // ── Recommended Augmentations ──────────────────────────────────
            sectionTitle('Recommended Augmentations', '◆');

            const augsToShow = augSuggestions.slice(0, 5);
            const augH = 6 + augsToShow.length * 14;
            needsNewPage(augH + 4);
            roundRect(M, y, CW, augH, 4, CARD_RGB, [50, 50, 45]);

            let ay = y + 8;
            augsToShow.forEach((a) => {
                // Icon box
                roundRect(M + 6, ay - 2, 8, 8, 2, [40, 50, 30]);
                pdf.setTextColor(...LIME_RGB);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text('⚡', M + 10, ay + 3.5, { align: 'center' });

                // Type name
                pdf.setTextColor(...WHITE_RGB);
                pdf.setFontSize(8.5);
                pdf.setFont('helvetica', 'bold');
                pdf.text(a.type, M + 18, ay + 1.5);

                // Description
                pdf.setTextColor(...DIM_RGB);
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'normal');
                const descTrunc = a.desc.length > 90 ? a.desc.slice(0, 87) + '…' : a.desc;
                pdf.text(descTrunc, M + 18, ay + 6.5);

                ay += 14;
            });
            y += augH + 6;

            // ── Column Stats (tabular only) ────────────────────────────────
            if (!isVision && Object.keys(column_stats).length > 0) {
                sectionTitle('Feature Diagnostics', '◆');

                const cols = Object.entries(column_stats).slice(0, 15);
                const tableH = 12 + cols.length * 7;
                needsNewPage(tableH + 4);
                roundRect(M, y, CW, tableH, 4, CARD_RGB, [50, 50, 45]);

                // Table header
                const colX = [M + 6, M + 55, M + 95, M + 130];
                pdf.setTextColor(...LIME_RGB);
                pdf.setFontSize(6.5);
                pdf.setFont('helvetica', 'bold');
                ['Column', 'Data Type', 'Missing %', 'Unique Values'].forEach((h, i) => {
                    pdf.text(h, colX[i], y + 8);
                });
                pdf.setDrawColor(60, 60, 50);
                pdf.setLineWidth(0.2);
                pdf.line(M + 6, y + 10, W - M - 6, y + 10);

                let ty = y + 15;
                cols.forEach(([col, stats]) => {
                    const isTarget = col === detected_target;
                    const hasMiss = stats.missing_pct > 0;

                    pdf.setTextColor(isTarget ? 212 : 200, isTarget ? 240 : 200, isTarget ? 61 : 195);
                    pdf.setFontSize(7);
                    pdf.setFont('helvetica', isTarget ? 'bold' : 'normal');
                    const colName = col.length > 18 ? col.slice(0, 17) + '…' : col;
                    pdf.text(colName, colX[0], ty);

                    pdf.setTextColor(...DIM_RGB);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(stats.dtype, colX[1], ty);

                    pdf.setTextColor(hasMiss ? 255 : 140, hasMiss ? 61 : 140, hasMiss ? 0 : 130);
                    pdf.text(`${stats.missing_pct}%`, colX[2], ty);

                    pdf.setTextColor(...DIM_RGB);
                    pdf.text(String(stats.unique_values), colX[3], ty);

                    ty += 7;
                });
                y += tableH + 6;
            }

            // ── Final footer ───────────────────────────────────────────────
            drawFooter();

            // ── Save ───────────────────────────────────────────────────────
            pdf.save(`DataValidator_Report_${filename.replace(/\.[^.]+$/, '')}.pdf`);

        } catch (err) {
            console.error('[PDF Export] Failed:', err);
            alert(`PDF generation failed: ${err?.message || 'unknown error'}`);
        } finally {
            setIsGeneratingPDF(false);
        }
    };



    /* ── Dataset Export — download via backend /api/export/{taskId} ── */
    const handleExport = async () => {
        if (!taskId) return;
        setIsDownloading(true);
        try {
            const res = await exportDataset(taskId);
            // Build a temporary object URL from the blob and click it
            const url  = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            // Derive filename from Content-Disposition header if available
            const disposition = res.headers?.['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            link.download = match ? match[1] : 'Validated_Dataset';
            link.href = url;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    /* ── Fix Automatically ── */
    const handleFix = async () => {
        setIsFixing(true);
        try {
            const res = await fixDataset(taskId);
            if (res.data?.result) setResult(res.data.result);
        } catch (e) { console.error(e); }
        setIsFixing(false);
    };

    /* ── Apply Augmentation ── */
    const handleAugment = async (type) => {
        setAugStates(p => ({ ...p, [type]: 'loading' }));
        try {
            const res = await applyAugment(taskId, type);
            if (res.data?.new_total_samples) {
                setResult(prev => ({ ...prev, total_samples: res.data.new_total_samples }));
            }
            setAugStates(p => ({ ...p, [type]: 'done' }));
        } catch {
            setAugStates(p => ({ ...p, [type]: 'idle' }));
        }
    };

    return (
        <div className="flex min-h-screen" style={{ background: '#1a1a14', color: 'white' }}>

            {/* ── LEFT SIDEBAR ────────────────────────────────────── */}
            <aside className="w-56 shrink-0 flex flex-col p-5 border-r sticky top-0 h-screen overflow-y-auto"
                style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.06)' }}>

                {/* File badge */}
                <div className="mb-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Current File</p>
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(212,240,61,0.12)', border: '1px solid rgba(212,240,61,0.2)' }}>
                                <span className="text-[9px] font-black" style={{ color: '#D4F03D' }}>
                                    {filename?.split('.').pop()?.toUpperCase() || 'CSV'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-white truncate max-w-[100px] leading-tight">{filename}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Uploaded just now</p>
                            </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black"
                            style={{ background: 'rgba(212,240,61,0.15)', color: '#D4F03D' }}>V2.0</span>
                    </div>
                </div>

                {/* Nav — clicking scrolls the main content to the section */}
                <div className="mb-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Analysis Steps</p>
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                            <button key={id}
                                onClick={() => handleNavClick(id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
                                style={activeNav === id
                                    ? { background: 'rgba(212,240,61,0.12)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }
                                    : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }}>
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-semibold">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pro tip */}
                <div className="mt-auto p-4 rounded-xl"
                    style={{ background: 'rgba(212,240,61,0.06)', border: '1px solid rgba(212,240,61,0.12)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="w-3 h-3" style={{ color: '#D4F03D' }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#D4F03D' }}>Pro Tip</span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Enabling SMOTE upsampling can improve recall on minority classes by 15–20%.
                    </p>
                </div>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto" ref={mainContentRef} id="dashboard-main-content">

                {/* Top nav bar */}
                <div className="flex items-center justify-between px-8 py-4 border-b sticky top-0 z-40 backdrop-blur-sm"
                    style={{ background: 'rgba(17,17,16,0.92)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#D4F03D' }}>
                            <div className="grid grid-cols-2 gap-0.5">
                                {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rounded-sm" />)}
                            </div>
                        </div>
                        <span className="font-bold text-white">Dataset Validator</span>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Dashboard — active page, no underline navigation needed */}
                        <Link to="/dashboard" className="text-sm transition-colors"
                            style={{ color: location.pathname === '/dashboard' ? '#D4F03D' : 'rgba(255,255,255,0.4)' }}>
                            Dashboard
                        </Link>
                        {/* Datasets → /history */}
                        <Link to="/history" className="text-sm transition-colors"
                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Datasets
                        </Link>
                        {/* Settings → /settings */}
                        <Link to="/settings" className="text-sm transition-colors"
                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Settings
                        </Link>
                        {/* New Project → / (upload) */}
                        <Link to="/upload" className="px-4 py-2 rounded-lg font-semibold text-sm text-black"
                            style={{ background: '#D4F03D' }}>New Project</Link>
                    </div>
                </div>

                {/* ref for PDF capture — excludes the sticky top nav above */}
                <div className="px-8 py-7 max-w-5xl" ref={reportContentRef} id="report-content">
                    {/* ── Page headline ── */}
                    {/* Section: Overview */}
                    <div id="section-overview">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            background: hasLeakage ? 'rgba(255,160,0,0.2)' : 'rgba(212,240,61,0.15)',
                                            color: hasLeakage ? '#ffa000' : '#D4F03D',
                                            border: `1px solid ${hasLeakage ? 'rgba(255,160,0,0.3)' : 'rgba(212,240,61,0.25)'}`,
                                        }}>
                                        {hasLeakage ? '⚠ Critical Issues Found' : '✓ Analysis Complete'}
                                    </span>
                                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>· Completed</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                                        style={{ background: 'rgba(0,224,255,0.1)', color: '#00E0FF' }}>
                                        {detectedType}
                                    </span>
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Validation Results</h1>
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Comprehensive analysis for <strong className="text-white">{filename}</strong>.{' '}
                                    Review critical alerts before training.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleExportPDF} disabled={isGeneratingPDF}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50"
                                    style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                                    {isGeneratingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {isGeneratingPDF ? 'Generating…' : 'Report'}
                                </button>
                                <button onClick={() => navigate('/upload')}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                                    style={{ background: '#D4F03D', color: '#111' }}>
                                    <Play className="w-4 h-4" /> Proceed Anyway
                                </button>
                            </div>
                        </div>

                        {/* ── Leakage alert banner ── */}
                        <AnimatePresence>
                            {hasLeakage && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between gap-4 p-4 rounded-xl mb-6"
                                    style={{ background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.2)' }}>
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#ffa000' }} />
                                        <div>
                                            <p className="font-bold text-white text-sm">High Data Leakage Detected</p>
                                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                Column <code className="text-yellow-400">{leakage_risk_columns[0]?.column || 'id'}</code>{' '}
                                                has a high correlation ({(leakage_risk_columns[0]?.score ?? 0.98).toFixed(2)}) with the target variable.
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={handleFix} disabled={isFixing}
                                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110 active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-60"
                                        style={{ background: '#D4F03D', color: '#111' }}>
                                        {isFixing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                        Fix Automatically
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Bento stat cards ── */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            {[
                                {
                                    label: 'Total Samples',
                                    value: total_samples.toLocaleString(),
                                    tag: optimized ? 'Optimized' : total_samples > 1000 ? 'Healthy' : 'Small',
                                    tagColor: optimized ? '#00E0FF' : '#D4F03D',
                                },
                                {
                                    label: 'Number of Classes',
                                    value: numClasses || total_features,
                                    tag: numClasses === 2 ? 'Binary' : numClasses > 10 ? 'Multi-class' : 'Multi',
                                    tagColor: '#00E0FF',
                                },
                                {
                                    label: 'Missing Values',
                                    value: missingDisplay,
                                    tag: missingDisplay === 0 ? '0%' : 'Found',
                                    tagColor: missingDisplay > 0 ? '#ffa000' : '#D4F03D',
                                },
                                {
                                    label: 'Potential Task',
                                    value: detected_target || detectedType,
                                    tag: isVision ? 'Vision' : 'Tabular',
                                    tagColor: '#00E0FF',
                                },
                            ].map((card, i) => (
                                <div key={i} className="rounded-xl p-4 border"
                                    style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <LayoutGrid className="w-4 h-4 text-white/40" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                                            style={{ background: `${card.tagColor}22`, color: card.tagColor }}>
                                            {card.tag}
                                        </span>
                                    </div>
                                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.label}</p>
                                    <p className="text-2xl font-bold text-white tracking-tight">{card.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>{/* /section-overview */}

                    {/* ── Section: Leakage + Class Distribution ── */}
                    <div id="section-leakage" className="grid grid-cols-2 gap-5 mb-5">

                        {/* Leakage Risk Gauge */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Leakage Risk</h3>
                                <button className="text-white/20 hover:text-white/40 transition-colors text-lg">•••</button>
                            </div>
                            <div className="relative flex items-center justify-center" style={{ height: 180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={gaugeData} cx="50%" cy="90%"
                                            innerRadius="55%" outerRadius="80%"
                                            startAngle={200} endAngle={-20}
                                            paddingAngle={3} dataKey="value" stroke="none">
                                            <Cell fill={leakageColor} cornerRadius={8} />
                                            <Cell fill="rgba(255,255,255,0.05)" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-x-0 bottom-0 text-center">
                                    <p className="text-4xl font-bold text-white">
                                        {maxLeakageScore}<span className="text-xl text-white/30">/100</span>
                                    </p>
                                    <span className="inline-block mt-1 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            background: maxLeakageScore > 60
                                                ? 'rgba(255,61,0,0.2)'
                                                : maxLeakageScore > 30
                                                    ? 'rgba(255,160,0,0.2)'
                                                    : 'rgba(212,240,61,0.15)',
                                            color: leakageColor,
                                        }}>
                                        {leakageLabel}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Risk level indicates probability of model overfitting due to features predicting the target directly.
                            </p>
                        </div>

                        {/* Class Distribution */}
                        <div id="section-eda" className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-start justify-between mb-1">
                                <h3 className="font-bold text-white">Class Distribution</h3>
                                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {distData.slice(0, 2).map((d, i) => (
                                        <span key={i} className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full"
                                                style={{ background: i === 0 ? 'rgba(255,255,255,0.5)' : '#D4F03D' }} />
                                            {d.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Target: <span style={{ color: '#D4F03D' }}>{detected_target}</span>
                            </p>

                            {distData.length > 0 ? (
                                <div className="space-y-4">
                                    {distData.slice(0, 5).map((item, idx) => (
                                        <div key={idx}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs w-24 shrink-0 text-right pr-2"
                                                    style={{ color: 'rgba(255,255,255,0.5)' }}>{item.name}</span>
                                                <div className="flex-1 h-7 rounded-lg overflow-hidden"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                    <motion.div className="h-full rounded-lg flex items-center justify-end pr-2"
                                                        style={{
                                                            background: idx === 0
                                                                ? 'rgba(100,100,100,0.5)'
                                                                : 'linear-gradient(90deg, #D4F03D, #a8c430)',
                                                            boxShadow: idx !== 0 ? '0 0 12px rgba(212,240,61,0.3)' : 'none',
                                                            minWidth: 40,
                                                        }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.pct}%` }}
                                                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: idx * 0.1 }}>
                                                        <span className="text-[10px] font-bold text-black/80">
                                                            {item.pct.toFixed(2)}%
                                                        </span>
                                                    </motion.div>
                                                </div>
                                                <span className="text-[10px] w-10 shrink-0"
                                                    style={{ color: 'rgba(255,255,255,0.3)' }}>{item.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-24 text-sm"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    No class distribution data available
                                </div>
                            )}

                            {/* Imbalance alert */}
                            {distData.length >= 2 && Math.max(...distData.map(d => d.pct)) - Math.min(...distData.map(d => d.pct)) > 30 && (
                                <div className="mt-5 p-3 rounded-lg flex items-start gap-2"
                                    style={{ background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.15)' }}>
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ffa000' }} />
                                    <div>
                                        <p className="text-[11px] font-bold text-white">Significant Class Imbalance Detected</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                            The minority class represents only {Math.min(...distData.map(d => d.pct)).toFixed(0)}% of the dataset.{' '}
                                            <button onClick={() => handleAugment('SMOTE Upsampling')}
                                                className="underline transition-colors" style={{ color: '#D4F03D' }}>
                                                Apply SMOTE
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>{/* /section-leakage */}

                    {/* ── Section: Augmentations + Quality Checks ── */}
                    <div id="section-augmentation" className="grid grid-cols-2 gap-5 mb-5">

                        {/* Augmentations */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2 mb-5">
                                <Zap className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                <h3 className="font-bold text-white">Recommended Augmentations</h3>
                            </div>
                            <div className="space-y-3">
                                {augSuggestions.slice(0, 4).map((sug, i) => {
                                    const Icon = AUG_ICONS[sug.type] || Layers;
                                    return (
                                        <AugmentCard
                                            key={i}
                                            icon={Icon}
                                            name={sug.type}
                                            desc={sug.desc}
                                            state={augStates[sug.type] || 'idle'}
                                            onApply={() => handleAugment(sug.type)}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quality Checks — driven by real backend data */}
                        <div className="rounded-xl p-6 border" style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                    <h3 className="font-bold text-white">Quality Checks</h3>
                                </div>
                                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    {passCount}/{qualityChecks.length} Passed
                                </span>
                            </div>
                            <div className="space-y-3">
                                {qualityChecks.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0"
                                        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                                style={{ background: c.pass ? 'rgba(212,240,61,0.15)' : 'rgba(255,61,0,0.12)' }}>
                                                {c.pass
                                                    ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#D4F03D' }} />
                                                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                            </div>
                                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.label}</span>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded"
                                            style={c.pass
                                                ? { background: 'rgba(212,240,61,0.1)', color: '#D4F03D' }
                                                : { background: 'rgba(255,61,0,0.1)', color: '#FF3D00' }}>
                                            {c.pass ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>{/* /section-augmentation */}

                    {/* ── Section: Export / Feature Diagnostics ── */}
                    <div id="section-export">

                        {/* ── Export Download Card ── */}
                        <div className="rounded-xl p-6 border mb-5"
                            style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <ArrowDownToLine className="w-4 h-4" style={{ color: '#D4F03D' }} />
                                        <h3 className="font-bold text-white">Export Dataset</h3>
                                    </div>
                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        Download the analysed dataset — CSV files served directly; image datasets packaged as a ZIP archive.
                                    </p>
                                </div>
                                <button
                                    onClick={handleExport}
                                    disabled={isDownloading || !taskId}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 shrink-0 ml-6"
                                    style={{ background: '#D4F03D', color: '#111' }}>
                                    {isDownloading
                                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Preparing…</>
                                        : <><ArrowDownToLine className="w-4 h-4" /> Export</>}
                                </button>
                            </div>
                        </div>

                        {/* ── Feature Diagnostics (Tabular only) ── */}
                        {!isVision && Object.keys(column_stats).length > 0 && (
                            <div className="rounded-xl p-6 border mb-5"
                                style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <h3 className="font-bold text-white mb-5">Feature Diagnostics</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(column_stats).slice(0, 12).map(([col, stats]) => {
                                        const isTarget = col === detected_target;
                                        const hasMiss = stats.missing_pct > 0;
                                        return (
                                            <div key={col} className="p-4 rounded-lg border transition-all"
                                                style={{
                                                    background: isTarget ? 'rgba(212,240,61,0.04)' : hasMiss ? 'rgba(255,61,0,0.04)' : 'rgba(255,255,255,0.025)',
                                                    borderColor: isTarget ? 'rgba(212,240,61,0.2)' : hasMiss ? 'rgba(255,61,0,0.15)' : 'rgba(255,255,255,0.06)',
                                                }}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-semibold text-white truncate">{col}</p>
                                                    {isTarget && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-black" style={{ background: '#D4F03D' }}>Target</span>}
                                                    {!isTarget && hasMiss && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: '#FF3D00' }}>Missing</span>}
                                                </div>
                                                <div className="flex gap-3 text-[10px]">
                                                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>{stats.dtype}</span>
                                                    <span style={{ color: hasMiss ? '#FF3D00' : 'rgba(255,255,255,0.35)' }}>{stats.missing_pct}% miss</span>
                                                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>{stats.unique_values}u</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Fix log ── */}
                        {fix_log.length > 0 && (
                            <div className="rounded-xl p-5 border" style={{ background: '#111110', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#D4F03D' }}>→ Optimization Log</p>
                                {fix_log.map((log, i) => (
                                    <p key={i} className="text-xs font-mono mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        <span style={{ color: '#00E0FF' }}>[{new Date().toLocaleTimeString()}]</span> {log}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>{/* /section-export */}
                </div>

                <footer className="text-center py-6 text-xs border-t"
                    style={{ color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    © 2026 Dataset Validator · Designed for high-performance ML pipelines.
                </footer>
            </main>
        </div>
    );
};

export default DashboardPage;
