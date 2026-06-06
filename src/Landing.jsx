import React from 'react';

export default function Landing({ onLoginClick }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* FEJLÉC */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', background: 'var(--white)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '24px' }}>
          ♟️ Chess Drill Master
        </h2>
        <button className="btn-primary" onClick={onLoginClick}>
          Bejelentkezés
        </button>
      </header>

      {/* FŐ TARTALOM (HERO SECTION) */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '700px', textAlign: 'center', padding: '50px 30px' }}>
          
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--text-dark)', lineHeight: '1.2' }}>
            Mesteri Megnyitások. <br />
            <span style={{ color: 'var(--primary-blue)' }}>Lépésről Lépésre.</span>
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: 'var(--text-light)', lineHeight: '1.6', marginBottom: '40px', padding: '0 20px' }}>
            Építsd fel a saját sakkmegnyitási repertoárodat, gyakorold a lépéseket interaktívan a táblán, és böngéssz a közösség által létrehozott legjobb variációk között!
          </p>
          
          <button className="btn-primary" style={{ fontSize: '1.2rem', padding: '15px 40px', margin: '0 auto' }} onClick={onLoginClick}>
            Kezdd el most – Ingyenes! 🚀
          </button>
          
        </div>
      </main>
      
    </div>
  );
}