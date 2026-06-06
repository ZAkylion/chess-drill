import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DrillPlayer from './DrillPlayer';
import DrillEditor from './DrillEditor';
import VariationExplorer from './VariationExplorer';
import Profile from './Profile';
import Courses from './Courses';
import Settings from './Settings';

function App() {
  const [view, setView] = useState('home');
  const [drillToEdit, setDrillToEdit] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Publikus és saját kurzusok tárolása az Explorer számára
  const [explorerCourses, setExplorerCourses] = useState([]);

  // ADMIN beállítás
  const isAdmin = session?.user?.email === 'sajat.email@cimed.hu'; 

  // Globális beállítások állapota
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

  // Auth kezelése
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Publikus és saját megnyitások lekérése az Explorerhez
  useEffect(() => {
    async function fetchExplorerCourses() {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('user_repertoires')
        .select(`
          id,
          user_id,
          kategoria,
          is_public,
          variaciok (
            id,
            nev,
            lepesek
          )
        `)
        .or(`is_public.eq.true,user_id.eq.${session.user.id}`); 

      if (!error && data) {
        // 1. KISZŰRJÜK AZ ÜRES MEGNYITÁSOKAT (Ahol a variációk listája üres vagy hiányzik)
        const csakAmibenVanLepes = data.filter(repo => repo.variaciok && repo.variaciok.length > 0);

        // 2. Átalakítjuk az adatokat az Explorer által várt formátumra
        const formattedCourses = csakAmibenVanLepes.map(repo => ({
          id: repo.id,
          cim: repo.kategoria, 
          user_id: repo.user_id,
          is_public: repo.is_public,
          drills: repo.variaciok 
        }));
        
        setExplorerCourses(formattedCourses);
      } else if (error) {
        console.error("Adatbázis hiba a repertoárok lekérésekor:", error);
      }
    }

    if (session) {
      fetchExplorerCourses();
    }
  }, [session]);

  if (loadingAuth) return <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '20px', color: 'var(--primary-blue)' }}>Betöltés... ⏳</div>;
  if (!session) return <Profile session={session} onBack={null} isAdmin={isAdmin} />;

  if (view === 'home') {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto 40px auto', textAlign: 'center', position: 'relative', fontFamily: 'sans-serif' }}>
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100 }}>
          <button className="btn-outline" onClick={() => setView('profile')} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
            👤 Profil
          </button>
        </div>

        <div className="card">
          <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>♟️ Chess Drill Master</h1>
          <p style={{ color: 'var(--text-light)', fontSize: '16px', marginBottom: '30px' }}>
            Üdvözlünk, <strong>{session.user.user_metadata?.username || 'Felhasználó'}</strong>! {isAdmin && <span style={{color: '#F59E0B'}}>👑 (Admin)</span>}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button className="btn-primary" onClick={() => setView('courses')} style={{ height: '55px', fontSize: '18px' }}>📚 Kurzusok</button>
            <button className="btn-primary" onClick={() => setView('play')} style={{ height: '55px', fontSize: '18px', background: 'white', color: 'var(--primary-blue)', border: '2px solid var(--primary-blue)' }}>🚀 Gyakorlás</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
              <button className="btn-outline" onClick={() => setView('explorer')}>🔍 Explorer</button>
              <button className="btn-outline" onClick={() => setView('edit')}>⚙️ Szerkesztés</button>
            </div>
            <button className="btn-outline" onClick={() => setView('settings')} style={{ marginTop: '5px', border: 'none', color: 'var(--text-light)' }}>⚙️ Beállítások</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'courses' && <Courses onBack={() => setView('home')} session={session} isAdmin={isAdmin} />}
      {view === 'profile' && <Profile session={session} onBack={() => setView('home')} isAdmin={isAdmin} />}
      {view === 'settings' && <Settings onBack={() => setView('home')} settings={settings} setSettings={setSettings} />}
      {view === 'play' && <DrillPlayer onBack={() => setView('home')} session={session} settings={settings} />}
      {view === 'explorer' && (
        <VariationExplorer 
          publicCourses={explorerCourses} 
          onBack={() => setView('home')} 
          onEditDrill={(d) => { setDrillToEdit(d); setView('edit'); }} 
          settings={settings} 
        />
      )}
      {view === 'edit' && <DrillEditor onBack={() => { setView('home'); setDrillToEdit(null); }} initialDrill={drillToEdit} clearInitial={() => setDrillToEdit(null)} session={session} isAdmin={isAdmin} settings={settings} />}
    </>
  );
}

export default App;