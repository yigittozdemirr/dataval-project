import React, { useState } from 'react';

const SafeAvatar = ({ src, name = '', size = 36, className = '', style = {} }) => {
    const [imgError, setImgError] = useState(false);

    const initials = name
        .trim()
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    const showImage = src && !imgError;

    const fontSize = size <= 36 ? Math.round(size * 0.36) : Math.round(size * 0.3);

    const base = {
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
    };

    if (showImage) {
        return (
            <div className={className} style={{ ...base, background: 'transparent' }}>
                <img
                    src={src}
                    alt={name || 'avatar'}
                    onError={() => setImgError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            </div>
        );
    }

    /* Initials fallback */
    return (
        <div
            className={className}
            style={{
                ...base,
                background: 'rgba(212,240,61,0.18)',
            }}
        >
            <span
                style={{
                    color: '#D4F03D',
                    fontSize,
                    fontWeight: 700,
                    lineHeight: 1,
                    userSelect: 'none',
                    letterSpacing: '-0.01em',
                }}
            >
                {initials}
            </span>
        </div>
    );
};

export default SafeAvatar;
