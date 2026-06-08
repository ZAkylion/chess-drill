import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { boardThemes, getCustomPieces } from './chessConfig';

export default function Courses({ onBack, session, isAdmin, settings }) {
  const [drillLista, setDrillLista] = useState([]);
  const [myRepertoire, setMyRepertoire] = useState([]);
  const [loadingKategoria, setLoadingKategoria] = useState(null);

  // Kereső (Filter) állapotok
  const [courseSearch, setCourseSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  
  // Mini sakktábla állapotai a kereséshez
  const [searchGame, setSearchGame] = useState(new Chess());
  const [searchMoves, setSearchMoves] = useState([]);

  const lang = settings?.language || 'hu';
  const t = translations[lang];

  useEffect(() => { 
    fetchList(); 
    if (session) fetchRepertoire();
  }, [session]);

  async function fetchList() {
    const { data, error } = await supabase.from('variaciok').select('*');
    if (error) {
      console.error("Hiba a kurzusok lekérésekor:", error);
      return;
    }
    if (data) {
      setDrillLista(data);
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
    if (!session) return alert(t.alertLoginRequired);
    setLoadingKategoria(kategoria); 
    
    try {
      if (myRepertoire.includes(kategoria)) {
        const { data, error } = await supabase
          .from('user_repertoires')
          .delete()
          .eq('user_id', session.user.id)
          .eq('kategoria', kategoria)
          .select(); 

        if (error) throw error;
        if (!data || data.length === 0) throw new Error(t.errorDeleteDenied);

        setMyRepertoire(prev => prev.filter(k => k !== kategoria));
      } else {
        const { data, error } = await supabase
          .from('user_repertoires')
          .insert([{ user_id: session.user.id, kategoria }])
          .select(); 

        if (error) throw error;
        if (!data || data.length === 0) throw new Error(t.errorSaveDenied);

        setMyRepertoire(prev => [...prev, kategoria]);
      }
    } catch (error) {
      console.error("Adatbázis hiba:", error);
      alert(`${t.errorOperationFailed}${error.message}`);
    } finally {
      setLoadingKategoria(null); 
    }
  }

  // Mini tábla húzásának kezelése
  function onSearchDrop(source, target) {
    const gameCopy = new Chess(searchGame.fen());
    let move = null;
    try { 
      move = gameCopy.move({ from: source, to: target, promotion: 'q' }); 
    } catch(e) {}
    
    if (move) {
      setSearchGame(gameCopy);
      setSearchMoves(prev => [...prev, move.san]);
      return true;
    }
    return false;
  }

  // Mini tábla és lépések törlése
  function resetSearchBoard() {
    setSearchGame(new Chess());
    setSearchMoves([]);
  }

  // 1. Kurzusok csoportosítása és variációk kigyűjtése a szűréshez
  const groupedCourses = useMemo(() => {
    const courses = {};
    drillLista.forEach(drill => {
      if (!courses[drill.kategoria]) {
        courses[drill.kategoria] = { 
          nev: drill.kategoria, 
          allapot: drill.allapot,
          szerzo: drill.szerzo_nev === '' ? null : (drill.szerzo_nev || t.defaultUser), 
          count: 0,
          variations: [] // Összes variáció lépéseinek tárolása
        };
      }
      courses[drill.kategoria].count++;
      if (drill.lepesek) {
        courses[drill.kategoria].variations.push(drill.lepesek);
      }
    });
    return Object.values(courses);
  }, [drillLista, t.defaultUser]);

  // 2. Keresési algoritmus futtatása (Név, Szerző, Lépések alapján)
  const filteredCourses = useMemo(() => {
    return groupedCourses.filter(c => {
      // Szűrés a kurzus nevére (Kis/Nagybetű független)
      if (courseSearch && !c.nev.toLowerCase().includes(courseSearch.toLowerCase())) {
        return false;
      }
      
      // Szűrés a készítőre
      const authorName = c.szerzo || '';
      if (authorSearch && !authorName.toLowerCase().includes(authorSearch.toLowerCase())) {
        return false;
      }
      
      // Szűrés a mini táblán tett lépésekre
      if (searchMoves.length > 0) {
        const searchPrefix = searchMoves.join(',');
        const hasMatchingVariation = c.variations.some(lepesek => {
          // Csak a lépéssorozat elejét vizsgáljuk a keresett hosszig
          const lepesekPrefix = lepesek.split(',').slice(0, searchMoves.length).join(',');
          return lepesekPrefix === searchPrefix;
        });
        
        if (!hasMatchingVariation) {
          return false;
        }
      }
      
      return true;
    });
  }, [groupedCourses, courseSearch, authorSearch, searchMoves]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', width: '100%', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button className="btn-outline" onClick={onBack}>{t.backToMenu}</button>
          <h2 style={{ color: 'var(--primary-blue)', margin: 0 }}>{t.coursesTitle}</h2>
          <div style={{ width: '150px' }}></div>
        </div>
        
        {!session && <p style={{ color: '#EF4444', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>{t.loginToBuildRepertoire}</p>}

        {/* KERESŐ PANEL */}
        <div className="card" style={{ marginBottom: '30px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          
          {/* Szöveges szűrők */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '1.2rem' }}>{t.filterTitle}</h3>
            <input 
              type="text" 
              className="input-field" 
              placeholder={t.searchCoursePlaceholder} 
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            <input 
              type="text" 
              className="input-field" 
              placeholder={t.searchAuthorPlaceholder} 
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
            />
          </div>

          {/* Mini Sakktábla szűrő */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '0.9rem', textAlign: 'center' }}>
              {t.searchByMovesTitle}<br/>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 'normal' }}>
                {t.searchByMovesSubtitle}
              </span>
            </h4>
            <div style={{ width: '180px', boxShadow: 'var(--shadow-md)', borderRadius: '4px', overflow: 'hidden' }}>
              <Chessboard 
                id="search-board"
                position={searchGame.fen()} 
                onPieceDrop={onSearchDrop}
                customPieces={getCustomPieces(settings?.pieceStyle)}
                customDarkSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.dark }}
                customLightSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.light }}
                showBoardNotation={false}
              />
            </div>
            {searchMoves.length > 0 && (
              <button 
                className="btn-outline" 
                onClick={resetSearchBoard}
                style={{ padding: '4px 10px', fontSize: '12px', width: '180px', borderColor: '#EF4444', color: '#EF4444' }}
              >
                {t.clearBtn} ({searchMoves.length} {t.movesCount})
              </button>
            )}
          </div>

        </div>

        {/* EREDMÉNYEK GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredCourses
            .sort((a, b) => (b.allapot === 'alap') - (a.allapot === 'alap'))
            .map(c => {
            const isAdded = myRepertoire.includes(c.nev);
            const isLoading = loadingKategoria === c.nev;
            
            return (
              <div key={c.nev} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px' }}>
                <div>
                  <h3 style={{ margin: '0 0 10px 0' }}>
                    📂 {c.nev}
                  </h3>
                  
                  {c.allapot === 'alap' ? (
                    <span style={{ display: 'inline-block', margin: '5px 0', background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{t.officialCourse}</span>
                  ) : (
                    <p style={{ margin: '5px 0', fontSize: '14px', color: 'var(--text-light)' }}>{t.createdBy} <strong>{c.szerzo}</strong></p>
                  )}
                  
                  <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>{t.variationsLabel} <strong>{c.count} {t.pcs}</strong></p>
                </div>
                
                <button 
                  className={isAdded ? "btn-primary" : "btn-outline"}
                  onClick={() => toggleRepertoire(c.nev)}
                  disabled={isLoading}
                  style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? t.processing : (isAdded ? t.inRepertoire : t.addToRepertoire)}
                </button>
              </div>
            );
          })}
        </div>
        
        {filteredCourses.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: '40px', fontSize: '1.1rem' }}>
            {t.noCoursesMatch}
          </p>
        )}
      </div>
    </div>
  );
}