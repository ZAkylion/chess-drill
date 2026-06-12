import React, { useState, useEffect, useMemo } from 'react';
import { supabase, fetchAllRows } from './supabaseClient'; // Új fetchAllRows import
import { translations } from './translations';
import { Chess } from 'chess.js';
import InteractiveBoard from './InteractiveBoard'; // A központi sakktáblánk

export default function Courses({ onBack, session, isAdmin, settings }) {
  const [drillLista, setDrillLista] = useState([]);
  const [myRepertoire, setMyRepertoire] = useState([]);
  const [loadingKategoria, setLoadingKategoria] = useState(null);

  const [courseSearch, setCourseSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  
  const [searchGame, setSearchGame] = useState(new Chess());
  const [searchMoves, setSearchMoves] = useState([]);
  
  const [searchBoardOrientation, setSearchBoardOrientation] = useState('white');
  const [isBoardHovered, setIsBoardHovered] = useState(false);

  const lang = settings?.language || 'hu';
  const t = translations[lang] || translations['hu'] || {};

  useEffect(() => { 
    fetchList(); 
    if (session) fetchRepertoire();
  }, [session]);

  // JAVÍTOTT: Az 1000 soros limit megkerülése
  async function fetchList() {
    try {
      const data = await fetchAllRows('variaciok'); 
      if (data) {
        setDrillLista(data);
      }
    } catch (error) {
      console.error("Hiba a kurzusok lekérésekor:", error);
    }
  }

  async function fetchRepertoire() {
    const { data, error } = await supabase.from('user_repertoires').select('kategoria').eq('user_id', session.user.id);
    if (error) {
      console.error("Hiba a repertoár lekérésekor:", error);
      return;
    }
    if (data) {
      setMyRepertoire(data.map(item => item.kategoria));
    }
  }

  async function toggleRepertoire(kategoria) {
    if (!session) return alert(t.alertLoginRequired || (lang === 'en' ? 'Log in to build your repertoire!' : 'Be kell jelentkezned a repertoár építéséhez!'));
    setLoadingKategoria(kategoria); 
    
    try {
      if (myRepertoire.includes(kategoria)) {
        const { error } = await supabase
          .from('user_repertoires')
          .delete()
          .eq('user_id', session.user.id)
          .eq('kategoria', kategoria);

        if (error) throw error;

        setMyRepertoire(prev => prev.filter(k => k !== kategoria));
      } else {
        const { error } = await supabase
          .from('user_repertoires')
          .insert([{ user_id: session.user.id, kategoria: kategoria }]);

        if (error) throw error;

        setMyRepertoire(prev => [...prev, kategoria]);
      }
    } catch (error) {
      console.error("Adatbázis hiba:", error);
      alert(`${t.errorOperationFailed || 'Művelet sikertelen: '} ${error.message}`);
    } finally {
      setLoadingKategoria(null); 
    }
  }

  // JAVÍTOTT LÉPÉSMOTOR AZ INTERACTIVE BOARDHOZ
  function handleSearchMoveAttempt(source, target) {
    const gameCopy = new Chess(searchGame.fen());
    let move = null;
    try { 
      move = gameCopy.move({ from: source, to: target, promotion: 'q' }); 
    } catch(e) { return false; }
    
    if (move) {
      setSearchGame(gameCopy);
      setSearchMoves(prev => [...prev, move.san]);
      return true;
    }
    return false;
  }

  function resetSearchBoard() {
    setSearchGame(new Chess());
    setSearchMoves([]);
  }

  function flipSearchBoard() {
    setSearchBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
    resetSearchBoard();
  }

  const groupedCourses = useMemo(() => {
    const courses = {};
    drillLista.forEach(drill => {
      if (!courses[drill.kategoria]) {
        courses[drill.kategoria] = { 
          nev: drill.kategoria, 
          allapot: drill.allapot,
          szerzo: drill.szerzo_nev === '' ? null : (drill.szerzo_nev || t.defaultUser || 'Felhasználó'), 
          count: 0,
          variations: [],
          hasWhite: false,
          hasBlack: false
        };
      }
      
      courses[drill.kategoria].count++;
      if (drill.lepesek) {
        courses[drill.kategoria].variations.push(drill.lepesek);
      }
      
      if (drill.nev && drill.nev.toLowerCase().includes('black')) {
        courses[drill.kategoria].hasBlack = true;
      } else {
        courses[drill.kategoria].hasWhite = true;
      }
    });
    
    return Object.values(courses).map(c => {
      if (c.hasBlack && !c.hasWhite) c.color = 'black';
      else if (!c.hasBlack && c.hasWhite) c.color = 'white';
      else c.color = 'mixed';
      return c;
    });
  }, [drillLista, t.defaultUser]);

  const filteredCourses = useMemo(() => {
    return groupedCourses.filter(c => {
      if (courseSearch && !c.nev.toLowerCase().includes(courseSearch.toLowerCase())) return false;
      
      const authorName = c.szerzo || '';
      if (authorSearch && !authorName.toLowerCase().includes(authorSearch.toLowerCase())) return false;
      
      if (colorFilter !== 'all' && c.color !== colorFilter && c.color !== 'mixed') {
        if (c.color !== colorFilter) return false;
      }
      
      if (searchMoves.length > 0) {
        const searchPrefix = searchMoves.join(',');
        const hasMatchingVariation = c.variations.some(lepesek => {
          const lepesekPrefix = lepesek.split(',').slice(0, searchMoves.length).join(',');
          return lepesekPrefix === searchPrefix;
        });
        if (!hasMatchingVariation) return false;
      }
      
      return true;
    });
  }, [groupedCourses, courseSearch, authorSearch, searchMoves, colorFilter]);

  const renderCourseList = (coursesToRender) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {coursesToRender
        .sort((a, b) => (b.allapot === 'alap') - (a.allapot === 'alap'))
        .map(c => {
        const isAdded = myRepertoire.includes(c.nev);
        const isLoading = loadingKategoria === c.nev;
        
        return (
          <div key={c.nev} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px', padding: '15px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>
                📂 {c.nev}
              </h3>
              
              {c.allapot === 'alap' ? (
                <span style={{ display: 'inline-block', margin: '5px 0', background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{t.officialCourse || (lang === 'en' ? '⭐ Official Course' : '⭐ Hivatalos Kurzus')}</span>
              ) : (
                <p style={{ margin: '5px 0', fontSize: '13px', color: 'var(--text-light)' }}>{t.createdBy || (lang === 'en' ? 'Created by:' : 'Létrehozta:')} <strong>{c.szerzo}</strong></p>
              )}
              
              <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '5px 0 0 0' }}>{t.variationsLabel || (lang === 'en' ? 'Variations:' : 'Variációk:')} <strong>{c.count} {t.pcs || (lang === 'en' ? 'pcs' : 'db')}</strong></p>
            </div>
            
            <button 
              className={isAdded ? "btn-primary" : "btn-outline"}
              onClick={() => toggleRepertoire(c.nev)}
              disabled={isLoading}
              style={{ width: '100%', opacity: isLoading ? 0.7 : 1, padding: '8px', fontSize: '0.9rem' }}
            >
              {isLoading ? (t.processing || (lang === 'en' ? '⏳ Processing...' : '⏳ Feldolgozás...')) : (isAdded ? (t.inRepertoire || (lang === 'en' ? '✅ In Repertoire' : '✅ Repertoárban')) : (t.addToRepertoire || (lang === 'en' ? '➕ Add to Repertoire' : '➕ Hozzáadás')))}
            </button>
          </div>
        );
      })}
    </div>
  );

  const whiteCourses = filteredCourses.filter(c => c.color === 'white');
  const blackCourses = filteredCourses.filter(c => c.color === 'black');
  const mixedCourses = filteredCourses.filter(c => c.color === 'mixed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', width: '100%', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button className="btn-outline" onClick={onBack}>{t.backToMenu || (lang === 'en' ? '⬅️ Back to main menu' : '⬅️ Vissza a főmenübe')}</button>
          <h2 style={{ color: 'var(--primary-blue)', margin: 0 }}>{t.coursesTitle || (lang === 'en' ? '📚 Courses (Community Folders)' : '📚 Kurzusok (Közösségi Mappák)')}</h2>
          <div style={{ width: '150px' }}></div>
        </div>
        
        {!session && <p style={{ color: '#EF4444', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>{t.loginToBuildRepertoire || (lang === 'en' ? 'Log in to build your repertoire!' : 'Jelentkezz be a repertoárépítéshez!')}</p>}

        {/* KERESŐ PANEL */}
        <div className="card" style={{ marginBottom: '40px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '1.2rem' }}>{t.filterTitle || '🔍 Filter'}</h3>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder={t.searchCoursePlaceholder || (lang === 'en' ? 'Search by course name...' : 'Keresés kurzusnév alapján...')} 
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                style={{ flex: '1 1 200px' }}
              />
              <input 
                type="text" 
                className="input-field" 
                placeholder={t.searchAuthorPlaceholder || (lang === 'en' ? 'Search by author...' : 'Keresés készítő alapján...')} 
                value={authorSearch}
                onChange={(e) => setAuthorSearch(e.target.value)}
                style={{ flex: '1 1 200px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px', padding: '12px 15px', background: 'var(--light-blue)', borderRadius: '8px', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--text-dark)' }}>{t.colorLabel || (lang === 'en' ? 'Color:' : 'Szín:')}</strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500' }}>
                <input type="radio" checked={colorFilter === 'all'} onChange={() => setColorFilter('all')} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-blue)' }} />
                {t.colorFilterAll || (lang === 'en' ? 'All colors' : 'Minden szín')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500' }}>
                <input type="radio" checked={colorFilter === 'white'} onChange={() => setColorFilter('white')} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-blue)' }} />
                {t.colorFilterWhite || (lang === 'en' ? 'White' : 'Világos')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500' }}>
                <input type="radio" checked={colorFilter === 'black'} onChange={() => setColorFilter('black')} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-blue)' }} />
                {t.colorFilterBlack || (lang === 'en' ? 'Black' : 'Sötét')}
              </label>
            </div>
          </div>

          {/* LÉPÉS ALAPÚ KERESŐ TÁBLA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '0.9rem', textAlign: 'center' }}>
              {t.searchByMovesTitle || (lang === 'en' ? 'Search by moves' : 'Lépés alapú keresés')}<br/>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 'normal' }}>
                {t.searchByMovesSubtitle || (lang === 'en' ? '(Drag on the board!)' : '(Húzz a táblán!)')}
              </span>
            </h4>
            
            <button 
              className="btn-outline" 
              onClick={flipSearchBoard}
              style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              🔄 {searchBoardOrientation === 'white' ? (t.colorWhite || 'Világos') : (t.colorBlack || 'Sötét')}
            </button>

            <div 
              onMouseEnter={() => setIsBoardHovered(true)}
              onMouseLeave={() => setIsBoardHovered(false)}
              style={{ 
                width: '180px', 
                boxShadow: 'var(--shadow-md)', 
                borderRadius: '4px', 
                overflow: 'hidden',
                transition: 'transform 0.2s ease-in-out, z-index 0.2s',
                transform: isBoardHovered ? 'scale(1.6)' : 'scale(1)',
                transformOrigin: 'top center',
                zIndex: isBoardHovered ? 100 : 1,
                position: 'relative'
              }}
            >
              {/* ÚJ INTERACTIVE BOARD A KERESÉSHEZ */}
              <InteractiveBoard 
                game={searchGame}
                boardOrientation={searchBoardOrientation}
                settings={{...settings, showCoordinates: false}}
                onMoveAttempt={handleSearchMoveAttempt}
              />
            </div>
            
            {searchMoves.length > 0 && (
              <button 
                className="btn-outline" 
                onClick={resetSearchBoard}
                style={{ padding: '4px 10px', fontSize: '12px', width: '180px', borderColor: '#EF4444', color: '#EF4444', marginTop: '5px' }}
              >
                {t.clearBtn || (lang === 'en' ? 'Clear' : 'Törlés')} ({searchMoves.length} {t.movesCount || (lang === 'en' ? 'moves' : 'lépés')})
              </button>
            )}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '30px', 
          alignItems: 'start' 
        }}>
          
          {whiteCourses.length > 0 && (
            <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid #D1D5DB', paddingBottom: '10px', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t.whiteOpenings || (lang === 'en' ? '⚪ White Openings' : '⚪ Világos megnyitások')}
              </h3>
              {renderCourseList(whiteCourses)}
            </div>
          )}

          {blackCourses.length > 0 && (
            <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid #D1D5DB', paddingBottom: '10px', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t.blackOpenings || (lang === 'en' ? '⚫ Black Openings' : '⚫ Sötét megnyitások')}
              </h3>
              {renderCourseList(blackCourses)}
            </div>
          )}

          {mixedCourses.length > 0 && (
            <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid #D1D5DB', paddingBottom: '10px', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t.mixedOpenings || (lang === 'en' ? '⚪⚫ Mixed Openings' : '⚪⚫ Vegyes megnyitások')}
              </h3>
              {renderCourseList(mixedCourses)}
            </div>
          )}

        </div>

        {filteredCourses.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: '40px', fontSize: '1.1rem' }}>
            {t.noCoursesMatch || (lang === 'en' ? 'No courses match the search criteria.' : 'Nincs a keresési feltételeknek megfelelő kurzus.')}
          </p>
        )}

      </div>
    </div>
  );
}
