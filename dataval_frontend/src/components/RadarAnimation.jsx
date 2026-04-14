import React from 'react';

/* Radar / Scanning Pulse Animation — pure CSS-driven SVG rings */
const RadarAnimation = ({ status = 'Scanning...', engineBars = 3 }) => (
    <div className="relative flex flex-col items-center justify-center" style={{ height: 380 }}>
        <style>{`
            @keyframes radarPulse {
                0%   { opacity: 0.7; transform: scale(1);   }
                100% { opacity: 0;   transform: scale(1.35); }
            }
            @keyframes rotate360 {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            @keyframes centerPulse {
                0%, 100% { opacity: 1;   }
                50%      { opacity: 0.5; }
            }
            .radar-ring-1 { animation: radarPulse 2.8s ease-out infinite; }
            .radar-ring-2 { animation: radarPulse 2.8s ease-out 0.9s infinite; }
            .radar-ring-3 { animation: radarPulse 2.8s ease-out 1.8s infinite; }
            .radar-sweep  { animation: rotate360 3s linear infinite; transform-origin: 50% 50%; }
            .center-icon  { animation: centerPulse 2s ease-in-out infinite; }
        `}</style>

        {/* Outer static rings */}
        <svg width="340" height="340" viewBox="0 0 340 340" className="absolute">
            <circle cx="170" cy="170" r="155" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" />
            <circle cx="170" cy="170" r="115" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
            <circle cx="170" cy="170" r="72" stroke="rgba(255,255,255,0.09)" strokeWidth="1" fill="none" />

            {/* Animated pulse rings */}
            <circle cx="170" cy="170" r="115" stroke="#D4F03D" strokeWidth="1.5" fill="none"
                className="radar-ring-1" style={{ opacity: 0.7 }} />
            <circle cx="170" cy="170" r="115" stroke="#D4F03D" strokeWidth="1" fill="none"
                className="radar-ring-2" style={{ opacity: 0.5 }} />
            <circle cx="170" cy="170" r="115" stroke="#D4F03D" strokeWidth="0.5" fill="none"
                className="radar-ring-3" style={{ opacity: 0.3 }} />

            {/* Sweep line */}
            <g className="radar-sweep">
                <line x1="170" y1="170" x2="170" y2="58" stroke="#D4F03D" strokeWidth="1.5"
                    strokeLinecap="round" strokeOpacity="0.6" />
                <line x1="170" y1="170" x2="170" y2="58"
                    stroke="url(#sweepGrad)" strokeWidth="28" strokeLinecap="round" strokeOpacity="0.12" />
                <defs>
                    <linearGradient id="sweepGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#D4F03D" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#D4F03D" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </g>

            {/* Cross-hairs */}
            <line x1="170" y1="20" x2="170" y2="320" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="20" y1="170" x2="320" y2="170" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </svg>

        {/* Center icon */}
        <div className="center-icon relative z-10 w-20 h-20 rounded-full flex items-center justify-center border-2"
            style={{ background: 'rgba(20,20,16,0.95)', borderColor: 'rgba(212,240,61,0.35)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4F03D" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                <path d="M11 8v6M8 11h6" strokeLinecap="round" />
            </svg>
        </div>

        {/* Status text */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4F03D" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{status}</span>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] font-black uppercase tracking-widest mr-1"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>ENGINE STATUS</span>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-sm"
                        style={{
                            width: 4, height: 10 + i * 4,
                            background: i < engineBars ? '#D4F03D' : 'rgba(255,255,255,0.1)',
                        }} />
                ))}
            </div>
        </div>
    </div>
);

export default RadarAnimation;
