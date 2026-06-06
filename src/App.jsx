import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DrillPlayer from './DrillPlayer';
import DrillEditor from './DrillEditor';
import VariationExplorer from './VariationExplorer';
import Profile from './Profile';
import Courses from './Courses';
import Settings from './Settings';
import Landing from './Landing'; // ÚJ
import Auth from './Auth';       // ÚJ

function App() {
  // A kezdeti nézetet mostantól a 'landing' határozza meg, ha nem vagyunk bejelentkezve
  const [view, setView] = useState('home');
  const [drillToEdit, setDrillToEdit] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const isAdmin = session?.user?.email === 'sajat.email@cimed.hu'; 

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('chessSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      botDelay: parsed.botDelay ?? 500,
      boardTheme: parsed.boardTheme || 'classic',
      pieceStyle: parsed.pieceStyle || 'default'
    };
  });

  useEffect(() => {
    localStorage.setItem('chessSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
      // Ha sikeresen bejelentkezett, rögtön a főmenübe dobjuk
      if (session) setView('home'); 
    });
    return () => subscription.unsubscribe();
  }, []);

  // Betöltő képernyő
  if (loadingAuth) return <div className="center-container" style={{ textAlign: 'center', marginTop: '100px', fontSize: '1.2rem', fontWeight: 'bold' }}>Betöltés... ⏳</div>;

  // HA NINCS BEJELENTKEZVE
  if (!session) {
    if (view === 'auth') return <Auth onBack={() => setView('landing')} />;
    return <Landing onLoginClick={() => setView('auth')} />;
  }

  // HA BE VAN JELENTKEZVE: Főmenü (Dashboard)
  if (view === 'home') {
    return (
      <div className="center-container" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div style={{ position: 'fixed', top: '20px', right: '20px' }}>
          <button className="btn-outline" onClick={() => setView('profile')}>👤 Profil</button>
        </div>
        
        <div className="card">
          <h1>♟️ Chess Drill Master</h1>
          <p>Üdvözlünk, <strong style={{ color: 'var(--primary-blue)' }}>{session.user.user_metadata?.username || 'Felhasználó'}</strong>! {isAdmin && <span>👑 (Admin)</span>}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
            <button className="btn-primary" onClick={() => setView('courses')}>📚 Kurzusok</button>
            <button className="btn-outline" onClick={() => setView('play')}>🚀 Gyakorlás</button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button className="btn-outline" onClick={() => setView('explorer')}>🔍 Explorer</button>
              <button className="btn-outline" onClick={() => setView('edit')}>⚙️ Szerkesztés</button>
            </div>
            
            <button className="btn-outline" onClick={() => setView('settings')}>⚙️ Beállítások</button>
          </div>
        </div>
      </div>
    );
  }

  // EGYÉB BELSŐ NÉZETEK
  return (
    <>
      {view === 'courses' && <Courses onBack={() => setView('home')} session={session} isAdmin={isAdmin} />}
      {view === 'profile' && <Profile session={session} onBack={() => setView('home')} isAdmin={isAdmin} />}
      {view === 'settings' && <Settings onBack={() => setView('home')} settings={settings} setSettings={setSettings} />}
      {view === 'play' && <DrillPlayer onBack={() => setView('home')} session={session} settings={settings} />}
      {view === 'explorer' && <VariationExplorer onBack={() => setView('home')} settings={settings} />}
      {view === 'edit' && <DrillEditor onBack={() => { setView('home'); setDrillToEdit(null); }} session={session} isAdmin={isAdmin} settings={settings} />}
    </>
  );
}
export default App;