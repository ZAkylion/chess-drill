import React, { useState, useEffect } from 'react';

export default function AndroidInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Elfogjuk a Chrome telepítési eseményét
    const handleBeforeInstallPrompt = (e) => {
      // Megakadályozzuk az alapértelmezett, automatikus felugrót
      e.preventDefault();
      // Eltesszük magát az eseményt, hogy később a gombra kattintva aktiválhassuk
      setDeferredPrompt(e);
      // Megjelenítjük a saját felületünket
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Ha a felhasználó sikeresen telepítette, elrejtjük a gombot
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA sikeresen telepítve!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Megjelenítjük a hivatalos Chrome telepítő ablakot
      deferredPrompt.prompt();
      // Megvárjuk a felhasználó döntését
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('A felhasználó elfogadta a telepítést.');
      } else {
        console.log('A felhasználó elutasította a telepítést.');
      }
      // Kinullázzuk a promptot (csak egyszer lehet meghívni)
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

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
        Telepítsd az appot!
      </p>
      <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#6B7280' }}>
        Add hozzá a Chess Drill Mastert a kezdőképernyődhöz a gyorsabb és teljes képernyős hozzáférésért!
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setShowPrompt(false)}
          style={{
            background: '#F3F4F6', color: '#374151', border: 'none', 
            padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold',
            cursor: 'pointer', flex: 1
          }}
        >
          Később
        </button>
        <button 
          onClick={handleInstallClick}
          style={{
            background: '#2E6295', color: '#fff', border: 'none', 
            padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold',
            cursor: 'pointer', flex: 2
          }}
        >
          Telepítés
        </button>
      </div>
    </div>
  );
}