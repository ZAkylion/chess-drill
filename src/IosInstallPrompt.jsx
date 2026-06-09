import React, { useState, useEffect } from 'react';

export default function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Megnézzük, hogy iOS eszközön van-e (iPhone, iPad, iPod)
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // 2. Megnézzük, hogy az app már a főképernyőn fut-e (standalone mód)
    const isInStandaloneMode = () => {
      return ('standalone' in window.navigator) && window.navigator.standalone;
    };

    // Ha iOS, és még NINCS telepítve, feldobjuk a tippet
    if (isIos() && !isInStandaloneMode()) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#ffffff',
      padding: '15px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      zIndex: 9999,
      width: '90%',
      maxWidth: '350px',
      textAlign: 'center',
      border: '1px solid #E5E7EB',
      fontFamily: "'Inter', sans-serif"
    }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#111827', fontWeight: 'bold' }}>
        Telepítsd az appot iPhone-ra!
      </p>
      <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#6B7280' }}>
        Koppints a <strong>Megosztás</strong> (négyzetből mutató nyíl) ikonra lent, majd válaszd a <strong>Főképernyőhöz adás</strong> opciót.
      </p>
      <button 
        onClick={() => setShowPrompt(false)}
        style={{
          background: '#2E6295', color: '#fff', border: 'none', 
          padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold',
          cursor: 'pointer', width: '100%'
        }}
      >
        Értettem
      </button>
    </div>
  );
}