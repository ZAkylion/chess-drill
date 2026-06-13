import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Courses from './Courses';
import DrillPlayer from './DrillPlayer';
import VariationExplorer from './VariationExplorer';
import DrillEditor from './DrillEditor';
import Settings from './Settings';
import Profile from './Profile';
import BackgroundChessboard from './BackgroundChessboard'; 
import useWindowSize from './useWindowSize'; 

import kingIcon from './icons/king.png';
import coursesIcon from './icons/courses.png';
import explorerIcon from './icons/explorer.png';
import settingsIcon from './icons/settings.png';
import practiceIcon from './icons/practice.png';
import editorIcon from './icons/editor.png';
import chessboardIcon from './icons/chessboard.png';
import IosInstallPrompt from './IosInstallPrompt';
import AndroidInstallPrompt from './AndroidInstallPrompt';

const MenuCard = ({ title, subtitle, imgSrc, onClick, span = 1, isRow = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const layoutClass = isRow ? 'menu-card-row' : 'menu-card-col';
  const iconClass = isRow ? 'icon-wrapper-row' : 'icon-wrapper-col';
  const titleClass = isRow ? 'title-row' : 'title-col';
  const subClass = isRow ? 'sub-row' : 'sub-col';
  
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`menu-card-container ${layoutClass}`}
      style={{
        gridColumn: `span ${span}`,
        background: isHovered ? '#2E6295' : '#ffffff',
        boxShadow: isHovered ? '0 12px 30px rgba(0,0,0,0.12)' : '0 3px 9px rgba(0,0,0,0.03)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        borderColor: isHovered ? '#2E6295' : '#E5E7EB',
      }}
    >
      <div className={iconClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img src={imgSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      
      <div className="menu-card-text-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1 }}>
        <h3 className={titleClass} style={{ margin: '0', fontWeight: 'bold', color: isHovered ? '#ffffff' : '#111827', transition: 'color 0.2s ease-in-out', lineHeight: '1.2' }}>
          {title}
        </h3>
        <p className={subClass} style={{ margin: '3px 0 0 0', color: isHovered ? '#E0E7FF' : '#6B7280', lineHeight: '1.3', transition: 'color 0.2s ease-in-out' }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('main'); 
  const { isMobile, isTablet } = useWindowSize(); 
  
  const [settings, setSettings] = useState({ 
    language: 'hu', boardTheme: 'blue', pieceStyle: 'cburnett', showCoordinates: true, showLegalMoves: true, botDelay: 600
  });

  const [importPayload, setImportPayload] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoImport') === 'true') {
      const moves = params.get('moves');
      const course = params.get('course') || '';
      const chapter = params.get('chapter') || '';
      
      if (moves) {
        setView('editor');
        window.history.replaceState({}, document.title, window.location.pathname); 
        
        setTimeout(() => {
           setImportPayload({ moves, course, chapter }); 
        }, 300);
      }
    }
  }, []);

  if (view === 'courses') return <Courses onBack={() => setView('main')} session={session} isAdmin={false} settings={settings} />;
  if (view === 'practice') return <DrillPlayer onBack={() => setView('main')} session={session} settings={settings} />;
  if (view === 'explorer') return <VariationExplorer onBack={() => setView('main')} settings={settings} />;
  
  if (view === 'editor') return <DrillEditor onBack={() => setView('main')} session={session} isAdmin={false} settings={settings} importPayload={importPayload} clearImportPayload={() => setImportPayload(null)} />;
  
  if (view === 'settings') return <Settings onBack={() => setView('main')} settings={settings} setSettings={setSettings} />;
  if (view === 'profile') return <Profile onBack={() => setView('main')} session={session} settings={settings} />;

  const lang = settings?.language || 'hu';
  const userName = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || (lang === 'en' ? 'Guest' : 'Vendég');
  const initials = userName.substring(0, 2).toUpperCase();

  return (
    <div style={{
      height: '100dvh', width: '100vw', position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
      background: '#E6EDF5', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', padding: isMobile ? '15px' : '30px', boxSizing: 'border-box', overflow: 'hidden', fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>

      <style>{`
        /* --- ASZTALI ALAPÉRTELMEZÉSEK --- */
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: 165px 165px 165px;
          gap: 18px;
          width: 100%;
          max-width: 1050px;
          flex: 1;
          min-height: 0;
          z-index: 10;
        }
        .menu-card-container {
          width: 100%; height: 100%; box-sizing: border-box; border-radius: 12px;
          cursor: pointer; transition: all 0.2s ease-in-out; display: flex;
          align-items: center; position: relative; overflow: hidden; border: 1px solid transparent;
        }

        .menu-card-col { flex-direction: column; justify-content: center; padding: 15px 15px 8px 15px; gap: 12px; text-align: center; }
        .menu-card-row { flex-direction: row; justify-content: flex-start; padding: 0 38px; gap: 30px; text-align: left; }
        
        .icon-wrapper-col { width: 53px; height: 53px; }
        .icon-wrapper-row { width: 68px; height: 68px; }
        
        .title-col { font-size: 21px; }
        .title-row { font-size: 26px; }
        
        .sub-col, .sub-row { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .sub-col { font-size: 17px; }
        .sub-row { font-size: 18px; }

        .welcome-card { grid-column: span 4; flex-direction: row; justify-content: flex-start; gap: 45px; padding: 0 50px; text-align: left; }
        .welcome-icon { width: 90px; }
        .welcome-bg { right: -15px; height: 240px; }
        .welcome-title { font-size: 39px; }
        .welcome-subtitle { font-size: 23px; }
        .welcome-desc { font-size: 20px; }

                                                                        /* --- MOBIL ÉS ÁLLÓ (PORTRAIT) NÉZET SZABÁLYAI (FIX MAGASSÁG, TILTOTT GÖRGETÉS) --- */
        @media (orientation: portrait), (max-width: 850px) {
          .menu-grid {
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important; 
            gap: clamp(4px, 1.2vh, 16px) !important; 
            padding-bottom: 0 !important;
            flex: 1 !important; 
            min-height: 0 !important; 
          }

          .menu-card-container {
            flex: 1 !important; 
            min-height: 0 !important; 
            height: 100% !important; 
            flex-direction: row !important;
            justify-content: flex-start !important;
            padding: clamp(6px, 1.5vh, 30px) clamp(10px, 4vw, 40px) !important;
            gap: clamp(10px, 3vw, 35px) !important;
            overflow: hidden !important; 
          }
          
          .menu-card-text-wrapper {
            text-align: left !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }
          
          .icon-wrapper-col, .icon-wrapper-row {
            width: clamp(28px, 6vh, 85px) !important; 
            height: clamp(28px, 6vh, 85px) !important;
          }
          
          .title-col, .title-row {
            font-size: clamp(14px, 2.5vh, 34px) !important;
            line-height: 1.1 !important;
          }
          
          .sub-col, .sub-row {
            font-size: clamp(10px, 1.8vh, 22px) !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important; 
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            margin-top: 2px !important;
            line-height: 1.2 !important;
          }
          
          .welcome-card {
            flex: 2.2 !important; 
            flex-direction: column !important;
            gap: clamp(2px, 1vh, 15px) !important; 
            padding: clamp(5px, 1.5vh, 35px) 10px !important; 
            text-align: center !important;
            justify-content: center !important;
          }
          .welcome-icon { width: clamp(25px, 6vh, 100px) !important; margin-bottom: -5px !important; }
          .welcome-bg { right: -30px !important; height: clamp(90px, 25vh, 250px) !important; }
          .welcome-title { 
            font-size: clamp(16px, 3vh, 42px) !important; 
            line-height: 1 !important; 
            margin: 0 !important; 
            white-space: nowrap !important; 
          }
          .welcome-subtitle { 
            font-size: clamp(12px, 2vh, 28px) !important; 
            line-height: 1.1 !important; 
            margin: 0 !important; 
          }
          .welcome-desc { 
            font-size: clamp(10px, 1.5vh, 22px) !important; 
            line-height: 1.1 !important; 
            margin: 0 !important; 
          }
        }
      
                /* --- KIFEJEZETTEN FEKTETETT (LANDSCAPE) TELEFONOKHOZ --- */
        @media (max-width: 950px) and (max-height: 600px) and (orientation: landscape) {
          .welcome-card {
            flex-direction: row !important;
            text-align: left !important;
            justify-content: center !important;
            gap: 20px !important;
            padding: 10px 20px !important;
          }
          .welcome-icon {
            width: clamp(30px, 12vh, 55px) !important;
            height: clamp(30px, 12vh, 55px) !important;
            margin-bottom: 0 !important;
          }
          /* A szövegeket balra zárjuk az ikon mellett */
          .welcome-card > div {
            align-items: flex-start !important;
            text-align: left !important;
          }
          .welcome-title {
            white-space: normal !important; 
          }
        }
      `}</style>

      <IosInstallPrompt />
      <AndroidInstallPrompt />
      <BackgroundChessboard />

      <div style={{ width: '100%', maxWidth: '1050px', display: 'flex', justifyContent: 'flex-end', paddingBottom: isMobile ? '15px' : '20px', zIndex: 10 }}>
        <div onClick={() => setView('profile')} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
          {!isMobile && <span style={{ fontWeight: '600', color: '#111827', fontSize: '23px' }}>{userName}</span>}
          <div style={{ 
            width: isMobile ? '45px' : '53px', height: isMobile ? '45px' : '53px', 
            borderRadius: '50%', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', 
            fontWeight: 'bold', color: '#111827', border: '1px solid #D1D5DB', boxShadow: '0 3px 8px rgba(0,0,0,0.05)', fontSize: isMobile ? '16px' : '21px'
          }}>
            {initials}
          </div>
        </div>
      </div>

      <div className="menu-grid">
        <div className="menu-card-container welcome-card" style={{ background: '#ffffff', boxShadow: '0 3px 9px rgba(0,0,0,0.03)', border: '1px solid #E5E7EB' }}>
          <img src={chessboardIcon} alt="Chessboard background" className="welcome-bg" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }} />
          <img src={kingIcon} alt="King" className="welcome-icon" style={{ height: 'auto', zIndex: 2, objectFit: 'contain' }} />
          
          <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="welcome-title" style={{ margin: '0 0 3px 0', color: '#0F172A', fontWeight: '800' }}>Chess Drill Master</h1>
            <p className="welcome-subtitle" style={{ margin: '0 0 3px 0', color: '#374151' }}>
              {lang === 'en' ? 'Welcome' : 'Üdvözöljük'}, <strong>{userName}</strong>!
            </p>
            <p className="welcome-desc" style={{ margin: 0, color: '#6B7280' }}>
              {lang === 'en' ? 'Choose a module:' : 'Válasszon egy modult:'}
            </p>
          </div>
        </div>

        <MenuCard span={2} isRow={true} imgSrc={coursesIcon} title={lang === 'en' ? 'Courses' : 'Kurzusok'} subtitle={lang === 'en' ? 'Personalize your opening repertoire!' : 'Szabja személyre megnyitási repertoárját!'} onClick={() => setView('courses')} />
        <MenuCard span={1} imgSrc={explorerIcon} title={lang === 'en' ? 'Explorer' : 'Böngésző'} subtitle={lang === 'en' ? 'Map out the openings' : 'Térképezze fel a megnyitásokat'} onClick={() => setView('explorer')} />
        <MenuCard span={1} imgSrc={settingsIcon} title={lang === 'en' ? 'Settings' : 'Beállítások'} subtitle={lang === 'en' ? 'Customize your account' : 'Testre szabhatja fiókját és az alkalmazást'} onClick={() => setView('settings')} />
        <MenuCard span={2} isRow={true} imgSrc={practiceIcon} title={lang === 'en' ? 'Practice' : 'Gyakorlás'} subtitle={lang === 'en' ? 'Test your knowledge with interactive drills' : 'Tesztelje tudását interaktív feladatokkal'} onClick={() => setView('practice')} />
        <MenuCard span={2} isRow={true} imgSrc={editorIcon} title={lang === 'en' ? 'Editor' : 'Szerkesztő'} subtitle={lang === 'en' ? 'Create your own openings' : 'Hozzon létre saját megnyitásokat'} onClick={() => setView('editor')} />
      </div>
    </div>
  );
}
