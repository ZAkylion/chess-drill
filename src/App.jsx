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

const MenuCard = ({ title, subtitle, imgSrc, onClick, span = 1, isRow = false, isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  let iconSize = isRow ? '68px' : '53px';
  let titleSize = isRow ? '26px' : '21px';
  let subSize = isRow ? '18px' : '17px';
  let gapSize = isRow ? '30px' : '12px';
  let padSize = isRow ? '0 38px' : '15px 15px 8px 15px';
  let flexDir = isRow ? 'row' : 'column';
  let textAlign = isRow ? 'left' : 'center';

  if (isMobile) {
    iconSize = '45px'; 
    titleSize = '18px'; 
    subSize = '13px'; 
    gapSize = '8px'; 
    padSize = '12px 10px'; 
    flexDir = 'column'; 
    textAlign = 'center'; 
  }
  
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        gridColumn: `span ${isMobile ? 1 : span}`,
        width: '100%',
        height: '100%', 
        boxSizing: 'border-box',
        background: isHovered ? '#2E6295' : '#ffffff',
        borderRadius: '12px',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 12px 30px rgba(0,0,0,0.12)' : '0 3px 9px rgba(0,0,0,0.03)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        flexDirection: flexDir,
        alignItems: 'center',
        justifyContent: 'center', 
        gap: gapSize,
        border: isHovered ? '1px solid #2E6295' : '1px solid #E5E7EB',
        padding: padSize,
        position: 'relative',
        overflow: 'hidden' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: iconSize, height: iconSize, flexShrink: 0 }}>
        <img src={imgSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      
      <div style={{ textAlign: textAlign, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <h3 style={{ margin: '0', fontSize: titleSize, fontWeight: 'bold', color: isHovered ? '#ffffff' : '#111827', transition: 'color 0.2s ease-in-out', lineHeight: '1.2' }}>
          {title}
        </h3>
        <p style={{ margin: '3px 0 0 0', fontSize: subSize, color: isHovered ? '#E0E7FF' : '#6B7280', lineHeight: '1.2', transition: 'color 0.2s ease-in-out', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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

  // ÚJ: Csomag állapot, ami átadja az importált adatokat a Szerkesztőnek
  const [importPayload, setImportPayload] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // AUTOMATIKUS IMPORT URL ELKAPÁSA
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoImport') === 'true') {
      const moves = params.get('moves');
      const course = params.get('course') || '';
      const chapter = params.get('chapter') || '';
      
      if (moves) {
        setView('editor');
        window.history.replaceState({}, document.title, window.location.pathname); // Tiszta URL
        
        setTimeout(() => {
           setImportPayload({ moves, course, chapter }); // Átadjuk az adatokat a Szerkesztőnek
        }, 300);
      }
    }
  }, []);

  if (view === 'courses') return <Courses onBack={() => setView('main')} session={session} isAdmin={false} settings={settings} />;
  if (view === 'practice') return <DrillPlayer onBack={() => setView('main')} session={session} settings={settings} />;
  if (view === 'explorer') return <VariationExplorer onBack={() => setView('main')} settings={settings} />;
  
  // ÁTADJUK AZ IMPORT CSOMAGOT A SZERKESZTŐNEK!
  if (view === 'editor') return <DrillEditor onBack={() => setView('main')} session={session} isAdmin={false} settings={settings} importPayload={importPayload} clearImportPayload={() => setImportPayload(null)} />;
  
  if (view === 'settings') return <Settings onBack={() => setView('main')} settings={settings} setSettings={setSettings} />;
  if (view === 'profile') return <Profile onBack={() => setView('main')} session={session} settings={settings} />;

  const lang = settings?.language || 'hu';
  const userName = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || (lang === 'en' ? 'Guest' : 'Vendég');
  const initials = userName.substring(0, 2).toUpperCase();

  const gridColumns = isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)');
  const gridRows = isMobile || isTablet ? 'auto' : '165px 165px 165px';
  const gridAutoRows = isMobile || isTablet ? 'minmax(0, 1fr)' : 'auto';

  return (
    <div style={{
      height: '100dvh', width: '100vw', position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
      background: '#E6EDF5', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', padding: isMobile ? '15px' : '30px', boxSizing: 'border-box', overflow: 'hidden', fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>

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

      <div style={{ 
        display: 'grid', gridTemplateColumns: gridColumns, gridTemplateRows: gridRows, gridAutoRows: gridAutoRows,
        gap: isMobile ? '10px' : '18px', width: '100%', maxWidth: '1050px', flex: 1, minHeight: 0, zIndex: 10 
      }}>
        <div style={{ 
          gridColumn: `span ${isMobile ? 1 : (isTablet ? 2 : 4)}`, background: '#ffffff', borderRadius: '12px', 
          display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'center' : 'center', 
          gap: isMobile ? '10px' : '45px', boxShadow: '0 3px 9px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', border: '1px solid #E5E7EB',
          width: '100%', height: '100%', boxSizing: 'border-box', padding: isMobile ? '15px 10px' : '0'
        }}>
          <img src={chessboardIcon} alt="Chessboard background" style={{ position: 'absolute', right: isMobile ? '-30px' : '-15px', top: '50%', transform: 'translateY(-50%)', height: isMobile ? '140px' : '240px', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }} />
          <img src={kingIcon} alt="King" style={{ width: isMobile ? '50px' : '90px', height: 'auto', zIndex: 2, objectFit: 'contain' }} />
          
          <div style={{ zIndex: 2, textAlign: isMobile ? 'center' : 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ margin: '0 0 3px 0', fontSize: isMobile ? '20px' : '39px', color: '#0F172A', fontWeight: '800' }}>Chess Drill Master</h1>
            <p style={{ margin: '0 0 3px 0', fontSize: isMobile ? '14px' : '23px', color: '#374151' }}>
              {lang === 'en' ? 'Welcome' : 'Üdvözöljük'}, <strong>{userName}</strong>!
            </p>
            <p style={{ margin: 0, fontSize: isMobile ? '12px' : '20px', color: '#6B7280' }}>
              {lang === 'en' ? 'Choose a module:' : 'Válasszon egy modult:'}
            </p>
          </div>
        </div>

        <MenuCard isMobile={isMobile} span={2} isRow={true} imgSrc={coursesIcon} title={lang === 'en' ? 'Courses' : 'Kurzusok'} subtitle={lang === 'en' ? 'Personalize your opening repertoire!' : 'Szabja személyre megnyitási repertoárját!'} onClick={() => setView('courses')} />
        <MenuCard isMobile={isMobile} span={1} imgSrc={explorerIcon} title={lang === 'en' ? 'Explorer' : 'Böngésző'} subtitle={lang === 'en' ? 'Map out the openings' : 'Térképezze fel a megnyitásokat'} onClick={() => setView('explorer')} />
        <MenuCard isMobile={isMobile} span={1} imgSrc={settingsIcon} title={lang === 'en' ? 'Settings' : 'Beállítások'} subtitle={lang === 'en' ? 'Customize your account' : 'Testre szabhatja fiókját és az alkalmazást'} onClick={() => setView('settings')} />
        <MenuCard isMobile={isMobile} span={2} isRow={true} imgSrc={practiceIcon} title={lang === 'en' ? 'Practice' : 'Gyakorlás'} subtitle={lang === 'en' ? 'Test your knowledge with interactive drills' : 'Tesztelje tudását interaktív feladatokkal'} onClick={() => setView('practice')} />
        <MenuCard isMobile={isMobile} span={2} isRow={true} imgSrc={editorIcon} title={lang === 'en' ? 'Editor' : 'Szerkesztő'} subtitle={lang === 'en' ? 'Create your own openings' : 'Hozzon létre saját megnyitásokat'} onClick={() => setView('editor')} />
      </div>
    </div>
  );
}