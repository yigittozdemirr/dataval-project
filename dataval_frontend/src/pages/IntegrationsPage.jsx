/**
 * IntegrationsPage.jsx — Supported formats & integrations for DataValidator
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, FileText, Package } from 'lucide-react';
import NavBar from '../components/NavBar.jsx';

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

const FILE_FORMATS = [
    { ext: '.csv',     desc: 'Comma-separated values — the default tabular format',  status: 'Supported' },
    { ext: '.xlsx',    desc: 'Microsoft Excel workbook format',                       status: 'Supported' },
    { ext: '.xls',     desc: 'Legacy Excel format (Excel 97–2003)',                   status: 'Supported' },
    { ext: '.json',    desc: 'JSON records array or object format',                   status: 'Supported' },
    { ext: '.parquet', desc: 'Apache Parquet columnar storage format',                status: 'Supported' },
    { ext: '.zip',     desc: 'ZIP archives containing any of the above, or image datasets', status: 'Supported' },
    { ext: '.png / .jpg / .jpeg', desc: 'Image classification or segmentation datasets inside ZIP', status: 'Supported' },
    { ext: '.sql',     desc: 'SQL dump import',                                       status: 'Planned' },
    { ext: '.feather', desc: 'Apache Arrow Feather format',                           status: 'Planned' },
];

const LIBS = [
    { name: 'pandas',      desc: 'Primary tabular data processing library. DataValidator reads and writes pandas DataFrames.' },
    { name: 'NumPy',       desc: 'Used internally for numerical analysis, outlier detection, and augmentation calculations.' },
    { name: 'scikit-learn', desc: 'Powers the SMOTE upsampling, resampling utilities, and leakage correlation scoring.' },
    { name: 'Pillow',      desc: 'Image loading and vision augmentation transforms (flip, rotate, jitter, noise).' },
    { name: 'PyArrow',     desc: 'Enables Parquet file reading and efficient columnar data handling.' },
    { name: 'OpenPyXL',    desc: 'Reads and writes Excel (.xlsx) files for tabular dataset support.' },
];

const IntegrationsPage = () => (
    <div className="min-h-screen flex flex-col" style={{ background: '#1a1a14', color: '#fff' }}>
        <NavBar variant="public" />

        {/* Hero */}
        <section className="text-center py-20 px-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,240,61,0.07) 0%, transparent 70%)',
            }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
                    style={{ background: 'rgba(212,240,61,0.1)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.2)' }}>
                    Integrations & Formats
                </span>
                <h1 className="text-5xl font-black tracking-tight mb-4">Supported File Formats</h1>
                <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    DataValidator works directly with the formats and libraries you already use.
                    No conversion pipeline required.
                </p>
            </motion.div>
        </section>

        <div className="max-w-5xl mx-auto px-8 pb-20 w-full space-y-8">
            {/* File formats table */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <FileText className="w-4 h-4" style={{ color: '#D4F03D' }} />
                    <p className="font-bold text-white">File Format Support</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {['Extension', 'Description', 'Status'].map(h => (
                                <th key={h} className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wider
                                    border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {FILE_FORMATS.map(({ ext, desc, status }) => (
                            <tr key={ext} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                <td className="px-6 py-3 font-mono font-bold" style={{ color: '#D4F03D' }}>{ext}</td>
                                <td className="px-6 py-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</td>
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold"
                                        style={{ color: status === 'Supported' ? '#D4F03D' : 'rgba(255,255,255,0.3)' }}>
                                        {status === 'Supported' && <CheckCircle2 className="w-3 h-3" />}
                                        {status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>

            {/* Python libraries */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: '#252520', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <Package className="w-4 h-4" style={{ color: '#D4F03D' }} />
                    <p className="font-bold text-white">Python Library Dependencies</p>
                </div>
                <div className="grid grid-cols-2 gap-0">
                    {LIBS.map(({ name, desc }, i) => (
                        <div key={name} className="px-6 py-4 border-b border-r"
                            style={{ borderColor: 'rgba(255,255,255,0.05)', borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <p className="font-bold text-white mb-1">{name}</p>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>

        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="max-w-5xl mx-auto px-8 py-10 flex items-center justify-between">
                <div>
                    <p className="font-bold text-white">Upload in any supported format</p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        DataValidator handles parsing automatically — no pre-processing needed.
                    </p>
                </div>
                <Link to="/signup" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black hover:brightness-110 transition-all"
                    style={{ background: '#D4F03D' }}>
                    Get Started <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    </div>
);

export default IntegrationsPage;
