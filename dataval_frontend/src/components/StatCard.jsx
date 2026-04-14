import React from 'react';

const StatCard = ({ icon: Icon, label, value, tag, tagColor = '#D4F03D' }) => (
    <div
        className="rounded-xl p-4 border flex flex-col gap-3"
        style={{ background: '#252520', borderColor: 'rgba(255,255,255,0.06)' }}
    >
        <div className="flex items-center justify-between">
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
            >
                {Icon && <Icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            </div>
            {tag && (
                <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: `${tagColor}22`, color: tagColor }}
                >
                    {tag}
                </span>
            )}
        </div>
        <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        </div>
    </div>
);

export default StatCard;
