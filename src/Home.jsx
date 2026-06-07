import React from 'react';
import { translations } from './translations';

export default function Home({ setView, session, isAdmin, settings }) {
  const lang = settings?.language || 'hu';
  const t = translations[lang];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      
      {/* Profil gomb a jobb felső sarokban (fix pozícióval) */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100 }}>
        <button className="btn-outline" onClick={() => setView('profile')} style={{ padding: '10px 20px', fontSize: '1rem', background: 'var(--white)' }}>
          {t.profileBtn}
        </button>
      </div>
      
      {/* Fő kártya (szigorúan középre igazítva, limitált szélességgel) */}
      <div className="card" style={{
        width: '100%',
        maxWidth: '500px', // Ez akadályozza meg, hogy szétnyúljon a képernyőn
        textAlign: 'center',
        padding: '50px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        
        <div style={{ marginBottom: '10px' }}>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>
            ♟️ Chess Drill Master
          </h1>
          <p style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-light)' }}>
            {t.welcome}<strong style={{ color: 'var(--primary-blue)' }}>{session.user.user_metadata?.username || 'Felhasználó'}</strong>! {isAdmin && <span>{t.adminBadge}</span>}
          </p>
        </div>
        
        {/* Gombok rácsszerkezete */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <button className="btn-primary" onClick={() => setView('courses')} style={{ padding: '16px', fontSize: '1.1rem' }}>
            {t.coursesBtn}
          </button>
          
          <button className="btn-outline" onClick={() => setView('play')} style={{ padding: '16px', fontSize: '1.1rem' }}>
            {t.practiceBtn}
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <button className="btn-outline" onClick={() => setView('explorer')} style={{ padding: '16px', fontSize: '1.1rem' }}>
              {t.explorerBtn}
            </button>
            <button className="btn-outline" onClick={() => setView('edit')} style={{ padding: '16px', fontSize: '1.1rem' }}>
              {t.editBtn}
            </button>
          </div>
          
          <button className="btn-outline" onClick={() => setView('settings')} style={{ padding: '16px', fontSize: '1.1rem' }}>
            {t.settingsBtn}
          </button>
          
        </div>
      </div>
    </div>
  );
}