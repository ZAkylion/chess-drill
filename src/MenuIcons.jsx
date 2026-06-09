import React from 'react';

// Király (Banner)
export const KingIcon = () => (
  <svg viewBox="0 0 100 100" width="85" height="85">
    <defs>
      <linearGradient id="kingFill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2b5c96" />
        <stop offset="100%" stopColor="#1a3c6b" />
      </linearGradient>
    </defs>
    <g stroke="#111827" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M 50 15 L 55 25 L 65 25 L 57 35 L 62 55 L 38 55 L 43 35 L 35 25 L 45 25 Z" fill="url(#kingFill)" />
      <path d="M 38 55 L 62 55 L 68 80 L 32 80 Z" fill="url(#kingFill)" />
      <rect x="25" y="80" width="50" height="10" rx="4" fill="#1e293b" />
      <path d="M 50 5 L 50 15 M 45 10 L 55 10" strokeWidth="5" />
      {/* Fények/Árnyékok a 3D hatáshoz */}
      <path d="M 42 55 L 45 78" stroke="#60a5fa" strokeWidth="2" opacity="0.5" />
    </g>
  </svg>
);

// Kurzusok (Könyvek)
export const BooksIcon = () => (
  <svg viewBox="0 0 100 100" width="80" height="80">
    <g stroke="#111827" strokeWidth="4" strokeLinejoin="round">
      {/* Alsó kék könyv */}
      <path d="M 20 70 L 70 85 L 90 70 L 40 55 Z" fill="#2b5c96" />
      <path d="M 20 70 L 20 60 L 70 75 L 70 85 Z" fill="#e2e8f0" />
      {/* Középső világos könyv */}
      <path d="M 18 60 L 68 75 L 88 60 L 38 45 Z" fill="#f8fafc" />
      <path d="M 18 60 L 18 50 L 68 65 L 68 75 Z" fill="#cbd5e1" />
      {/* Felső bordó könyv */}
      <path d="M 25 45 L 70 60 L 85 45 L 40 30 Z" fill="#991b1b" />
      <path d="M 25 45 L 25 35 L 70 50 L 70 60 Z" fill="#e2e8f0" />
      <path d="M 32 40 L 45 45" stroke="#fcd34d" strokeWidth="3" />
    </g>
  </svg>
);

// Böngésző (Nagyító)
export const ExplorerIcon = () => (
  <svg viewBox="0 0 100 100" width="70" height="70">
    <g stroke="#111827" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="45" cy="45" r="25" fill="#eff6ff" />
      <circle cx="45" cy="45" r="20" fill="#bfdbfe" stroke="none" />
      <path d="M 63 63 L 85 85" strokeWidth="12" stroke="#2b5c96" />
      <path d="M 63 63 L 85 85" strokeWidth="12" strokeDasharray="10 30" stroke="#111827" />
      <path d="M 35 35 A 10 10 0 0 1 50 35" fill="none" stroke="#ffffff" strokeWidth="4" />
    </g>
  </svg>
);

// Beállítások (Fogaskerék)
export const SettingsIcon = () => (
  <svg viewBox="0 0 100 100" width="70" height="70">
    <g stroke="#111827" strokeWidth="4" fill="#2b5c96" strokeLinejoin="round">
      <path d="M50 15 A35 35 0 1 0 50.1 15" strokeWidth="14" strokeDasharray="16 10" />
      <circle cx="50" cy="50" r="20" fill="#f8fafc" />
      <circle cx="50" cy="50" r="10" fill="#111827" />
    </g>
  </svg>
);

// Gyakorlás (Céltábla)
export const PracticeIcon = () => (
  <svg viewBox="0 0 100 100" width="75" height="75">
    <g stroke="#111827" strokeWidth="4">
      <circle cx="45" cy="55" r="32" fill="#e2e8f0" />
      <circle cx="45" cy="55" r="22" fill="#2b5c96" />
      <circle cx="45" cy="55" r="12" fill="#f8fafc" />
      <circle cx="45" cy="55" r="4" fill="#111827" />
      <path d="M 45 55 L 85 15" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
      <path d="M 70 15 L 85 15 L 85 30" fill="none" stroke="#111827" strokeWidth="5" strokeLinejoin="round" />
    </g>
  </svg>
);

// Szerkesztő (Fogaskerék + Ceruza)
export const EditorIcon = () => (
  <svg viewBox="0 0 100 100" width="75" height="75">
    <g stroke="#111827" strokeWidth="4" strokeLinejoin="round">
      <path d="M40 25 A25 25 0 1 0 40.1 25" fill="none" stroke="#2b5c96" strokeWidth="12" strokeDasharray="12 10" />
      <circle cx="40" cy="50" r="12" fill="#f8fafc" />
      <path d="M 85 20 L 35 70 L 20 75 L 25 60 L 75 10 Z" fill="#cbd5e1" />
      <path d="M 75 10 L 85 20" fill="#991b1b" />
      <path d="M 20 75 L 25 60 L 35 70 Z" fill="#111827" />
    </g>
  </svg>
);