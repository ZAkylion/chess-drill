import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DrillPlayer from './DrillPlayer';
import DrillEditor from './DrillEditor';
import VariationExplorer from './VariationExplorer';
import Profile from './Profile';
import Courses from './Courses';
import Settings from './Settings';
import Landing from './Landing';
import Auth from './Auth';
import Home from './Home'; // ÚJ IMPORT A KÖZÉPRE IGAZÍTOTT MENÜHÖZ
import { translations } from './translations';

function App() {
  const [view, setView] = useState('home');
  const [drillToEdit, setDrillToEdit] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const isAdmin = session?.user?.email === 'sajat.email@cimed.hu'; 

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('chessSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      language: parsed.language || 'hu',
      botDelay: parsed.botDelay ?? 500,
      boardTheme: parsed.boardTheme || 'classic',
      pieceStyle: parsed.pieceStyle || 'default',
      showCoordinates: parsed.showCoordinates ?? true,
      showLegalMoves: parsed.showLegalMoves ?? true
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
      if (session) setView('home'); 
    });
    return () => subscription.unsubscribe();
  }, []);

  const lang = settings.language || 'hu';
  const t = translations[lang];

  if (loadingAuth) return <div className="center-container" style={{ textAlign: 'center', marginTop: '100px', fontSize: '1.2rem', fontWeight: 'bold' }}>{t.loading}</div>;

  if (!session) {
    if (view === 'auth') return <Auth onBack={() => setView('landing')} settings={settings} />;
    return <Landing onLoginClick={() => setView('auth')} settings={settings} />;
  }

  // LETISZTÍTOTT RENDERELÉS:
  return (
    <>
      {view === 'home' && <Home setView={setView} session={session} isAdmin={isAdmin} settings={settings} />}
      {view === 'courses' && <Courses onBack={() => setView('home')} session={session} isAdmin={isAdmin} settings={settings} />}
      {view === 'profile' && <Profile session={session} onBack={() => setView('home')} isAdmin={isAdmin} settings={settings} />}
      {view === 'settings' && <Settings onBack={() => setView('home')} settings={settings} setSettings={setSettings} />}
      {view === 'play' && <DrillPlayer onBack={() => setView('home')} session={session} settings={settings} />}
      {view === 'explorer' && <VariationExplorer onBack={() => setView('home')} settings={settings} />}
      {view === 'edit' && <DrillEditor onBack={() => { setView('home'); setDrillToEdit(null); }} session={session} isAdmin={isAdmin} settings={settings} />}
    </>
  );
}

export default App;