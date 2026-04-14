import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const AugmentCard = ({ icon: Icon, name, desc, state, onApply }) => (
    <div
        className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
        style={{
            background: state === 'done' ? 'rgba(212,240,61,0.04)' : 'rgba(255,255,255,0.025)',
            borderColor: state === 'done' ? 'rgba(212,240,61,0.2)' : 'rgba(255,255,255,0.07)',
        }}
    >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(212,240,61,0.1)', border: '1px solid rgba(212,240,61,0.15)' }}>
            {Icon && <Icon className="w-4 h-4" style={{ color: '#D4F03D' }} />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
        </div>
        <button
            onClick={onApply}
            disabled={state === 'loading' || state === 'done'}
            className="px-4 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all hover:brightness-110 active:scale-95 disabled:cursor-default"
            style={
                state === 'done'
                    ? { background: 'rgba(212,240,61,0.12)', color: '#D4F03D', border: '1px solid rgba(212,240,61,0.25)' }
                    : state === 'loading'
                        ? { background: '#2e2e28', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                        : { background: '#2e2e28', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }
            }
        >
            {state === 'loading'
                ? <RefreshCw className="w-3 h-3 animate-spin inline" />
                : state === 'done'
                    ? '✓ Applied'
                    : 'Apply'}
        </button>
    </div>
);

export default AugmentCard;
