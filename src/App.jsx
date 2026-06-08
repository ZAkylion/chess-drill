import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // ÚJ IMPORTOK
import { supabase } from './supabaseClient';
import DrillPlayer from './DrillPlayer';
import DrillEditor from './DrillEditor';
import VariationExplorer from './VariationExplorer';
import Profile from './Profile';
import Courses from './Courses';
import Settings from './Settings';
import Landing from './Landing';
import Auth from './Auth';
import Home from './Home';
import { translations } from './translations';

function App() {
  const navigate = useNavigate(); // ÚJ: Navigációs függvény
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
      // INNEN KIVETTÜK A NAVIGÁCIÓT! Nincs több erőszakos visszadobálás.
    });

    return () => subscription.unsubscribe();
  }, []); // A navigate-t is kiveheted a függőségi tömbből (dependency array)
  const lang = settings.language || 'hu';
  const t = translations[lang];

  if (loadingAuth) return <div className="center-container" style={{ textAlign: 'center', marginTop: '100px', fontSize: '1.2rem', fontWeight: 'bold' }}>{t.loading}</div>;

  // HA NINCS BEJELENTKEZVE: Csak a Landing és az Auth érhető el
  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<Landing onLoginClick={() => navigate('/auth')} settings={settings} />} />
        <Route path="/auth" element={<Auth onBack={() => navigate('/')} settings={settings} />} />
        {/* Ha bármi más URL-t ír be kijelentkezve, visszadobjuk a főoldalra */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // HA BE VAN JELENTKEZVE: Elérhető az összes aloldal
  return (
    <Routes>
      <Route path="/" element={<Home setView={(path) => navigate(`/${path === 'home' ? '' : path}`)} session={session} isAdmin={isAdmin} settings={settings} />} />
      <Route path="/courses" element={<Courses onBack={() => navigate('/')} session={session} isAdmin={isAdmin} settings={settings} />} />
      <Route path="/profile" element={<Profile session={session} onBack={() => navigate('/')} isAdmin={isAdmin} settings={settings} />} />
      <Route path="/settings" element={<Settings onBack={() => navigate('/')} settings={settings} setSettings={setSettings} />} />
      <Route path="/play" element={<DrillPlayer onBack={() => navigate('/')} session={session} settings={settings} />} />
      <Route path="/explorer" element={<VariationExplorer onBack={() => navigate('/')} settings={settings} />} />
      <Route path="/edit" element={<DrillEditor onBack={() => navigate('/')} session={session} isAdmin={isAdmin} settings={settings} />} />
      {/* 404 fallback: Ha ismeretlen URL-t ad meg, menjen a Home-ra */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;