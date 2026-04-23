import React from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Avatar({ src, name, size = 'w-10 h-10', className = '', alt = '' }) {
  const base = API_URL.replace('/api', '');
  const imgSrc = src ? `${base}${src}` : null;
  const initials = (name || 'U').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className={`rounded-full overflow-hidden flex items-center justify-center bg-gray-200 text-gray-700 font-semibold ${size} ${className}`}>
      {imgSrc ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={imgSrc} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}
