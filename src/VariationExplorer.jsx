import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { supabase, fetchAllRows } from './supabaseClient'; // ÚJ: importáljuk a fetchAllRows-t
import { translations } from './translations';
import InteractiveBoard from './InteractiveBoard';

export default function VariationExplorer({ onBack, settings }) {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);
  const [lépésIndex, setLépésIndex] = useState(0);
  const [allVariations, setAllVariations] = useState([]);
  const [boardOrientation, setBoardOrientation] = useState('white');

  const [positionMap, setPositionMap] = useState({ map: {}, exact: {} });
  const [isProcessing, setIsProcessing] = useState(false);

  const lang = settings?.language || 'hu';
  const t = translations[lang] || translations['hu'] || {};

  // 1. KORLÁTLAN ADATLETÖLTÉS
  useEffect(() => {
    async function fetchAll() {
      // A régi supabase.from... hívás helyett az okos, lapozós letöltőt használjuk
      const data = await fetchAllRows('variaciok', 'allapot', 'publikus');
      if (data) setAllVariations(data);
    }
    fetchAll();
  }, []);

  // 2. BILLENTYŰZET NAVIGÁCIÓ
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lépésIndex, history]);

  // 3. ASZINKRON, SZELETELT FELDOLGOZÁS (Fagyás elkerülése)
  useEffect(() => {
    if (allVariations.length === 0) return;

    setIsProcessing(true);
    const map = {};
    const exact = {};

    const filteredVariations = allVariations.filter(drill => {
      const isBlack = drill.nev && drill.nev.toLowerCase().includes('black');
      return boardOrientation === 'black' ? isBlack : !isBlack;
    });

    let index = 0;
    const chunkSize = 30; // 30-as csomagokban dolgozzuk fel

    function processChunk() {
      const end = Math.min(index + chunkSize, filteredVariations.length);
      
      for (let i = index; i < end; i++) {
        const drill = filteredVariations[i];
        const tempGame = new Chess();
        const moves = drill.lepesek.split(',');
        let currentBaseFen = tempGame.fen().split(' ').slice(0, 4).join(' ');

        moves.forEach((moveSan) => {
          if (!map[currentBaseFen]) map[currentBaseFen] = {};
          if (!map[currentBaseFen][moveSan]) map[currentBaseFen][moveSan] = { count: 0, authors: new Set() };
          
          map[currentBaseFen][moveSan].count++;
          map[currentBaseFen][moveSan].authors.add(drill.szerzo_nev || t.defaultUser || 'Felhasználó');

          try {
            tempGame.move(moveSan);
            currentBaseFen = tempGame.fen().split(' ').slice(0, 4).join(' ');
          } catch (e) {}
        });

        if (!exact[currentBaseFen]) exact[currentBaseFen] = [];
        exact[currentBaseFen].push(drill);
      }

      index = end;

      if (index < filteredVariations.length) {
        setTimeout(processChunk, 0); // Visszaadjuk az irányítást a böngészőnek
      } else {
        setPositionMap({ map, exact });
        setIsProcessing(false); // Kész a betöltés!
      }
    }

    processChunk();

    return () => {
      index = filteredVariations.length; 
    };
  }, [allVariations, boardOrientation, t.defaultUser]);

  // 4. ELÉRHETŐ LÉPÉSEK KINYERÉSE
  const elerhetoLepesek = useMemo(() => {
    if (isProcessing) return { options: [], exactMatches: [] }; 

    const currentBaseFen = game.fen().split(' ').slice(0, 4).join(' ');
    const nextMovesData = positionMap.map[currentBaseFen] || {};
    const exactMatches = positionMap.exact[currentBaseFen] || [];

    const options = Object.entries(nextMovesData).map(([san, data]) => ({
      san,
      count: data.count,
      authors: Array.from(data.authors).join(', ')
    })).sort((a, b) => b.count - a.count);

    return { options, exactMatches };
  }, [positionMap, game.fen(), isProcessing]);

  // 5. ZÖLD NYILAK SZÁMÍTÁSA A TÁBLÁRA
  const explorerArrows = useMemo(() => {
    const arrows = [];
    elerhetoLepesek.options.forEach(opt => {
      const tempGame = new Chess(game.fen());
      try {
        const move = tempGame.move(opt.san);
        if (move) {
          arrows.push([move.from, move.to, 'rgba(76, 175, 80, 0.5)']);
        }
      } catch (e) {}
    });
    return arrows;
  }, [elerhetoLepesek, game.fen()]);

  // 6. LÉPÉSMOTOR
  function handleMoveAttempt(source, target) {
    const gameCopy = new Chess(game.fen());
    let move = null;
    try { 
      move = gameCopy.move({ from: source, to: target, promotion: 'q' }); 
    } catch(e) { 
      return false; 
    }
    
    if (move) {
      setGame(gameCopy);
      const newHistory = [...history.slice(0, lépésIndex + 1), { fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } }];
      setHistory(newHistory);
      setLépésIndex(newHistory.length - 1);
      return true;
    }
    return false;
  }

  function handlePrev() {
    if (lépésIndex > 0) {
      setLépésIndex(lépésIndex - 1);
      setGame(new Chess(history[lépésIndex - 1].fen));
    }
  }

  function handleNext() {
    if (lépésIndex < history.length - 1) {
      setLépésIndex(lépésIndex + 1);
      setGame(new Chess(history[lépésIndex + 1].fen));
    }
  }

  function loadVariation(movesStr) {
    const moves = movesStr ? movesStr.split(',') : [];
    const tempGame = new Chess();
    const newHistory = [{ fen: tempGame.fen(), lastMove: null }];
    moves.forEach(m => {
      const res = tempGame.move(m);
      if (res) newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to } });
    });
    setGame(tempGame);
    setHistory(newHistory);
    setLépésIndex(newHistory.length - 1);
  }

  function flipBoard() {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
    loadVariation('');
  }

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { 
    [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.4)' }, 
    [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.4)' } 
  } : {};

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>{t.backToMenu || 'Vissza a menübe'}</button>
        <h2 style={{ color: 'var(--primary-blue)', margin: 0 }}>{t.currentPosition || 'Jelenlegi Állás'}</h2>
        <div style={{ width: '150px' }}></div>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        <div style={{ width: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <button 
              className="btn-outline" 
              onClick={flipBoard}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '14px' }}
            >
              {t.flipBoardBtn || '🔄 Tábla megfordítása'} ({boardOrientation === 'white' ? (t.colorWhite || 'Világos') : (t.colorBlack || 'Sötét')})
            </button>
          </div>

          <div style={{ boxShadow: 'var(--shadow-md)', borderRadius: '4px', overflow: 'hidden' }}>
            <InteractiveBoard 
              game={game}
              boardOrientation={boardOrientation}
              settings={settings}
              onMoveAttempt={handleMoveAttempt}
              customSquareStyles={moveSquares}
              customArrows={explorerArrows}
            />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <button className="btn-outline" onClick={handlePrev} disabled={lépésIndex === 0} style={{ opacity: lépésIndex === 0 ? 0.5 : 1 }}>◀️</button>
            <button className="btn-outline" onClick={handleNext} disabled={lépésIndex === history.length - 1} style={{ opacity: lépésIndex === history.length - 1 ? 0.5 : 1 }}>▶️</button>
            <button className="btn-outline" onClick={() => loadVariation('')}>{t.resetBtn || 'Alaphelyzet'}</button>
          </div>
        </div>

        <div className="card" style={{ width: '400px', alignSelf: 'flex-start', maxHeight: '550px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary-blue)', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t.availableMoves || 'Elérhető Lépések'}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 'normal', alignSelf: 'flex-end' }}>
              ({boardOrientation === 'white' ? (t.colorWhite || 'Világos') : (t.colorBlack || 'Sötét')} repertoár)
            </span>
          </h3>

          {isProcessing ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--primary-blue)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px auto', width: '30px', height: '30px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p>Repertoár feldolgozása...</p>
            </div>
          ) : elerhetoLepesek.options.length === 0 && elerhetoLepesek.exactMatches.length === 0 ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '20px' }}>{t.noDataExplorer || 'Nincs adat ebből az állásból.'}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#F3F4F6', color: '#374151' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{t.moveCol || 'Lépés'}</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB' }}>{t.freqCol || 'Gyakoriság'}</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #E5E7EB' }}>{t.authorCol || 'Szerző'}</th>
                </tr>
              </thead>
              <tbody>
                {elerhetoLepesek.options.map(opt => (
                  <tr key={opt.san} 
                      onClick={() => {
                        const tempGame = new Chess(game.fen());
                        const move = tempGame.move(opt.san);
                        if(move) {
                          setGame(tempGame);
                          const newHistory = [...history.slice(0, lépésIndex + 1), { fen: tempGame.fen(), lastMove: { from: move.from, to: move.to } }];
                          setHistory(newHistory);
                          setLépésIndex(newHistory.length - 1);
                        }
                      }}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #eee', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#EFF6FF'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--text-dark)' }}>{opt.san}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <span style={{ background: 'var(--light-blue)', color: 'var(--primary-blue)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {opt.count}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '13px', color: 'var(--text-light)' }}>{opt.authors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isProcessing && elerhetoLepesek.exactMatches.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: '#059669', marginBottom: '10px' }}>✅ Ide kifutó teljes variációk:</h4>
              {elerhetoLepesek.exactMatches.map((drill, i) => (
                <div key={i} style={{ padding: '10px', background: '#ECFDF5', borderRadius: '6px', marginBottom: '8px', border: '1px solid #A7F3D0', fontSize: '14px' }}>
                  <strong>{drill.nev}</strong> <span style={{ color: '#666', fontSize: '12px' }}>({drill.szerzo_nev || t.defaultUser})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
} 