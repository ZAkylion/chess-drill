import React, { useState, useEffect } from 'react';
import Landing from './Landing';
import Auth from './Auth';
import Courses from './Courses';
import DrillPlayer from './DrillPlayer';
import DrillEditor from './DrillEditor';
import Profile from './Profile';
import Settings from './Settings';
import VariationExplorer from './VariationExplorer';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('landing');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('chessSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
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
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = session?.user?.email === 'sajat.email@cim.hu';

  const renderView = () => {
    switch (view) {
      case 'landing': return <Landing onStart={() => setView('courses')} onEditor={() => setView('editor')} onProfile={() => setView('profile')} onSettings={() => setView('settings')} onExplorer={() => setView('explorer')} session={session} />;
      case 'explorer': return <VariationExplorer onBack={() => setView('landing')} settings={settings} />;
      case 'courses': return <Courses onBack={() => setView('landing')} onSelectCourse={(course) => { setSelectedCourse(course); setView('player'); }} session={session} />;
      case 'player': return <DrillPlayer course={selectedCourse} onBack={() => setView('courses')} settings={settings} />;
      case 'editor': return <DrillEditor onBack={() => setView('landing')} session={session} isAdmin={isAdmin} settings={settings} />;
      case 'profile': return <Profile session={session} onBack={() => setView('landing')} isAdmin={isAdmin} />;
      case 'settings': return <Settings onBack={() => setView('landing')} settings={settings} setSettings={setSettings} />;
      default: return <Landing />;
    }
  };

  return <div className="App">{renderView()}</div>;
}

export default App;