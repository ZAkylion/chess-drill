import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { supabase, fetchAllRows } from './supabaseClient';
import { translations } from './translations';
import InteractiveBoard from './InteractiveBoard';

export default function VariationExplorer({ onBack, settings }) {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null, moveSan: '' }]);
  const [lépésIndex, setLépésIndex] = useState(0);
  const [allVariations, setAllVariations] = useState([]);
  const [boardOrientation, setBoardOrientation] = useState('white');

  const [positionMap, setPositionMap] = useState({ map: {}, exact: {} });
  const [isProcessing, setIsProcessing] = useState(false);

  const lang = settings?.language || 'hu';
  const t = translations[lang] || translations['hu'] || {};

  useEffect(() => {
    async function fetchAll() {
      const data = await fetchAllRows('variaciok', 'allapot', 'publikus');
      if (data) setAllVariations(data);
    }
    fetchAll();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lépésIndex, history]);

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
    const chunkSize = 30;

    function processChunk() {
      const end = Math.min(index + chunkSize, filteredVariations.length);
      
      for (let i = index; i < end; i++) {
        const drill = filteredVariations[i];
        const tempGame = new Chess();
        const moves = drill.lepesek.split(',');
        let currentBaseFen = tempGame.fen().split(' ').slice(0, 4).join(' ');

        moves.forEach((moveSan) => {
          if (!map[currentBaseFen]) map[currentBaseFen] = { moves: {}, courses: new Set() };
          const courseName = drill.kategoria || drill.kurzus_nev || drill.kurzus || drill.kategoriak || 'Egyéb';
          map[currentBaseFen].courses.add(courseName);
          
          if (!map[currentBaseFen].moves[moveSan]) map[currentBaseFen].moves[moveSan] = { count: 0 };
          
          map[currentBaseFen].moves[moveSan].count++;

          try {
            tempGame.move(moveSan);
            currentBaseFen = tempGame.fen().split(' ').slice(0, 4).join(' ');
          } catch (e) {}
        });

        if (!map[currentBaseFen]) map[currentBaseFen] = { moves: {}, courses: new Set() };
        const finalCourseName = drill.kategoria || drill.kurzus_nev || drill.kurzus || drill.kategoriak || 'Egyéb';
        map[currentBaseFen].courses.add(finalCourseName);

        if (!exact[currentBaseFen]) exact[currentBaseFen] = [];
        exact[currentBaseFen].push(drill);
      }

      index = end;

      if (index < filteredVariations.length) {
        setTimeout(processChunk, 0); 
      } else {
        setPositionMap({ map, exact });
        setIsProcessing(false); 
      }
    }

    processChunk();

    return () => {
      index = filteredVariations.length; 
    };
  }, [allVariations, boardOrientation, t.defaultUser]);

  const elerhetoLepesek = useMemo(() => {
    if (isProcessing) return { options: [], exactMatches: [], totalMoves: 0, courses: [] }; 

    const currentBaseFen = game.fen().split(' ').slice(0, 4).join(' ');
    const nodeData = positionMap.map[currentBaseFen] || { moves: {}, courses: new Set() };
    const exactMatches = positionMap.exact[currentBaseFen] || [];

    let totalMoves = 0;
    const options = Object.entries(nodeData.moves || {}).map(([san, data]) => {
      totalMoves += data.count;
      return {
        san,
        count: data.count
      };
    }).sort((a, b) => b.count - a.count);

    const courses = Array.from(nodeData.courses || []);

    return { options, exactMatches, totalMoves, courses };
  }, [positionMap, game.fen(), isProcessing]);

  const explorerArrows = useMemo(() => {
    const arrows = [];
    elerhetoLepesek.options.forEach(opt => {
      const tempGame = new Chess(game.fen());
      try {
        const move = tempGame.move(opt.san);
        if (move) {
          arrows.push([move.from, move.to, 'rgba(76, 175, 80, 0.4)']);
        }
      } catch (e) {}
    });
    return arrows;
  }, [elerhetoLepesek, game.fen()]);

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
      const newHistory = [...history.slice(0, lépésIndex + 1), { fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to }, moveSan: move.san }];
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
    const newHistory = [{ fen: tempGame.fen(), lastMove: null, moveSan: '' }];
    moves.forEach(m => {
      const res = tempGame.move(m);
      if (res) newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to }, moveSan: res.san });
    });
    setGame(tempGame);
    setHistory(newHistory);
    setLépésIndex(newHistory.length - 1);
  }

  function flipBoard() {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
    loadVariation('');
  }

  function goToMove(index) {
    setLépésIndex(index);
    setGame(new Chess(history[index].fen));
  }

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { 
    [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.4)' }, 
    [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.4)' } 
  } : {};

  const renderBreadcrumbs = () => {
    const pairs = [];
    for (let i = 1; i <= lépésIndex; i += 2) {
      pairs.push({
        moveNum: Math.floor(i / 2) + 1,
        white: history[i],
        whiteIndex: i,
        black: history[i + 1] || null,
        blackIndex: i + 1
      });
    }

    if (pairs.length === 0) return <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>{t.startPosition || 'Kezdőállás'}</span>;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {pairs.map((pair, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '13px' }}>{pair.moveNum}.</span>
            
            <span 
              onClick={() => goToMove(pair.whiteIndex)}
              style={{ 
                cursor: 'pointer', 
                fontWeight: lépésIndex === pair.whiteIndex ? 'bold' : 'normal',
                color: lépésIndex === pair.whiteIndex ? 'var(--primary-blue)' : 'var(--text-dark)',
                padding: '2px 4px',
                borderRadius: '4px',
                background: lépésIndex === pair.whiteIndex ? 'var(--light-blue)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = lépésIndex !== pair.whiteIndex ? '#F3F4F6' : 'var(--light-blue)'}
              onMouseOut={(e) => e.currentTarget.style.background = lépésIndex !== pair.whiteIndex ? 'transparent' : 'var(--light-blue)'}
            >
              {pair.white.moveSan}
            </span>

            {pair.black && (
              <span 
                onClick={() => goToMove(pair.blackIndex)}
                style={{ 
                  cursor: 'pointer', 
                  fontWeight: lépésIndex === pair.blackIndex ? 'bold' : 'normal',
                  color: lépésIndex === pair.blackIndex ? 'var(--primary-blue)' : 'var(--text-dark)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  background: lépésIndex === pair.blackIndex ? 'var(--light-blue)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = lépésIndex !== pair.blackIndex ? '#F3F4F6' : 'var(--light-blue)'}
                onMouseOut={(e) => e.currentTarget.style.background = lépésIndex !== pair.blackIndex ? 'transparent' : 'var(--light-blue)'}
              >
                {pair.black.moveSan}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
      background: 'linear-gradient(135deg, #F0F4F8 0%, #E2ECF6 100%)', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      paddingTop: '3vh', overflowY: 'auto', zIndex: 1000, fontFamily: "'Inter', 'Segoe UI', sans-serif", boxSizing: 'border-box' 
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', width: '100%', maxWidth: '1000px', marginBottom: '20px', padding: '0 20px' }}>
        <button className="btn-outline" onClick={onBack} style={{ background: 'var(--white)', padding: '8px 20px', flexShrink: 0 }}>{t.backBtn || 'Vissza'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', justifyContent: 'center', minWidth: '200px' }}>
          <span style={{ fontSize: '1.5rem' }}>🔍</span>
          <h2 style={{ color: 'var(--primary-blue)', margin: 0, fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', textAlign: 'center' }}>{t.explorerTitle || 'Repertoár Böngésző'}</h2>
        </div>
        <div style={{ width: '80px', flexShrink: 0, display: 'flex' }}></div>
      </div>

      <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '1000px', padding: '0 20px', paddingBottom: '40px' }}>
        
        {/* BAL OLDAL: SAKKTÁBLA KÁRTYA */}
        <div style={{ width: 'min(100%, 55vh)', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div className="card" style={{ padding: '8px', background: 'var(--white)' }}>
            <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
              <InteractiveBoard 
                game={game}
                boardOrientation={boardOrientation}
                settings={settings}
                playBothSides={true}
                onMoveAttempt={handleMoveAttempt}
                customSquareStyles={moveSquares}
                customArrows={explorerArrows}
              />
            </div>
          </div>

          {/* VEZÉRLŐK - CSS GRID MEGOLDÁS (GARANTÁLT 2x2 MOBILON) */}
          <style>{`
            .explorer-controls-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              padding: 12px;
              background: var(--white);
              border-radius: 8px;
              width: 100%;
              box-sizing: border-box;
            }
            .explorer-btn {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 5px;
              padding: 12px 5px;
              font-size: 14px;
              min-width: 0;
            }
            .btn-icon {
              font-size: 16px;
              flex-shrink: 0;
            }
            .btn-text {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            /* Mobilon szigorúan 2 oszlopos rács */
            @media (max-width: 600px) {
              .explorer-controls-grid {
                grid-template-columns: 1fr 1fr;
              }
            }
          `}</style>
          <div className="card explorer-controls-grid">
            <button className="btn-outline explorer-btn" onClick={() => loadVariation('')} title="Kezdőállás">
              <span className="btn-icon">⏮️</span> <span className="btn-text">Start</span>
            </button>
            <button className="btn-outline explorer-btn" onClick={handlePrev} disabled={lépésIndex === 0} style={{ opacity: lépésIndex === 0 ? 0.5 : 1 }}>
              <span className="btn-icon">◀️</span> <span className="btn-text">{t.prevBtn || 'Vissza'}</span>
            </button>
            <button className="btn-outline explorer-btn" onClick={handleNext} disabled={lépésIndex === history.length - 1} style={{ opacity: lépésIndex === history.length - 1 ? 0.5 : 1 }}>
              <span className="btn-text">{t.nextBtn || 'Előre'}</span> <span className="btn-icon">▶️</span>
            </button>
            <button className="btn-outline explorer-btn" onClick={flipBoard} title="Tábla megfordítása">
              <span className="btn-icon">🔄</span> <strong className="btn-text">{boardOrientation === 'white' ? '⚪' : '⚫'}</strong>
            </button>
          </div>
        </div>

        {/* JOBB OLDAL: ADATOK KÁRTYÁJA */}
        <div style={{ width: 'min(100%, 450px)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* KENYÉRMORZSA (EDDIGI LÉPÉSEK) */}
          <div className="card" style={{ padding: '15px', background: 'var(--white)', minHeight: '60px', display: 'flex', alignItems: 'center' }}>
             {renderBreadcrumbs()}
          </div>

          {/* STATISZTIKA ÉS LÉPÉSEK */}
          <div className="card" style={{ flex: 1, padding: '0', background: 'var(--white)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
            
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-dark)', fontSize: '15px' }}>{t.availableMoves || 'Lehetséges Folytatások'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-light)', background: '#E5E7EB', padding: '3px 8px', borderRadius: '10px' }}>
                 {isProcessing ? 'Töltés...' : `${elerhetoLepesek.options.length} lépés`}
              </span>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
              {isProcessing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--primary-blue)' }}>
                  <div className="spinner" style={{ margin: '0 auto 15px auto', width: '35px', height: '35px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ fontWeight: '500' }}>Adatbázis elemzése...</span>
                </div>
              ) : elerhetoLepesek.options.length === 0 && elerhetoLepesek.exactMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px', opacity: 0.5 }}>🏁</div>
                  <p style={{ margin: 0 }}>Nincs több ismert lépés a repertoárban ebből az állásból.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {elerhetoLepesek.options.map(opt => {
                    const percentage = elerhetoLepesek.totalMoves > 0 ? Math.round((opt.count / elerhetoLepesek.totalMoves) * 100) : 0;
                    
                    return (
                      <div 
                        key={opt.san} 
                        onClick={() => {
                          const tempGame = new Chess(game.fen());
                          const move = tempGame.move(opt.san);
                          if(move) {
                            setGame(tempGame);
                            const newHistory = [...history.slice(0, lépésIndex + 1), { fen: tempGame.fen(), lastMove: { from: move.from, to: move.to }, moveSan: move.san }];
                            setHistory(newHistory);
                            setLépésIndex(newHistory.length - 1);
                          }
                        }}
                        style={{ 
                          display: 'flex', alignItems: 'center', padding: '10px 15px', borderRadius: '8px', 
                          cursor: 'pointer', transition: 'background 0.2s', position: 'relative', overflow: 'hidden',
                          border: '1px solid transparent'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        {/* Háttér kitöltöttség arányosan */}
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percentage}%`, background: 'rgba(59, 130, 246, 0.08)', zIndex: 0, borderRight: '2px solid rgba(59, 130, 246, 0.2)' }}></div>
                        
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-dark)', width: '60px' }}>{opt.san}</span>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: '15px', justifyContent: 'center' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-blue)' }}>{opt.count} variációban</span>
                               <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>({percentage}%)</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* EBBEN A POZÍCIÓBAN ÉRINTETT KURZUSOK */}
              {!isProcessing && elerhetoLepesek.courses && elerhetoLepesek.courses.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #E5E7EB' }}>
                  <h4 style={{ color: 'var(--primary-blue)', margin: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>📚</span> Jelenlegi pozíció ezekben a kurzusokban:
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {elerhetoLepesek.courses.map((course, i) => (
                      <span key={i} style={{ padding: '4px 10px', background: 'var(--light-blue)', color: 'var(--primary-blue)', borderRadius: '15px', fontSize: '12px', fontWeight: '600' }}>
                        {course}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* PONTOS TALÁLATOK (KIFUTÓ VARIÁCIÓK) */}
              {!isProcessing && elerhetoLepesek.exactMatches.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #E5E7EB' }}>
                  <h4 style={{ color: '#059669', margin: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>🏁</span> Célba ért variációk ({elerhetoLepesek.exactMatches.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {elerhetoLepesek.exactMatches.map((drill, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#ECFDF5', borderRadius: '6px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#065F46', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drill.nev}</strong> 
                        <span style={{ color: '#047857', fontSize: '11px', background: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>{drill.szerzo_nev || t.defaultUser || 'Szerző'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
