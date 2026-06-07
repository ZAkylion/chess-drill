import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { supabase } from './supabaseClient';
import { boardThemes, getCustomPieces } from './chessConfig';

const getBaseFen = (fenString) => fenString.split(' ').slice(0, 4).join(' ');

export default function VariationExplorer({ onBack, settings }) {
  const [courses, setCourses] = useState([]); 
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [activeMove, setActiveMove] = useState(null);
  
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [arrows, setArrows] = useState([]);

  // ÚJ: Legális lépések vizualizációja
  const [optionSquares, setOptionSquares] = useState({});

  const customPieces = useMemo(() => getCustomPieces(settings?.pieceStyle), [settings?.pieceStyle]);
  const darkSquareStyle = { backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.dark };
  const lightSquareStyle = { backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.light };

  useEffect(() => {
    async function fetchAllCourses() {
      const { data } = await supabase.from('variaciok').select('*');
      if (data) {
        const grouped = data.reduce((acc, drill) => {
          if (!acc[drill.kategoria]) {
            acc[drill.kategoria] = { id: drill.kategoria, cim: drill.kategoria, drills: [] };
          }
          acc[drill.kategoria].drills.push(drill);
          return acc;
        }, {});
        setCourses(Object.values(grouped));
      }
    }
    fetchAllCourses();
  }, []);

  const rebuildGame = useCallback((moves) => {
    const newGame = new Chess();
    for (const m of moves) {
      try { newGame.move(m); } catch(e) {}
    }
    setGame(newGame);
    setFen(newGame.fen());
    setOptionSquares({});
  }, []);

  const handlePrev = useCallback(() => {
    if (moveIndex > 0) {
      const newIdx = moveIndex - 1;
      setMoveIndex(newIdx);
      rebuildGame(moveHistory.slice(0, newIdx));
      setActiveMove(null);
    }
  }, [moveIndex, moveHistory, rebuildGame]);

  const handleNext = useCallback(() => {
    if (moveIndex < moveHistory.length) {
      const newIdx = moveIndex + 1;
      setMoveIndex(newIdx);
      rebuildGame(moveHistory.slice(0, newIdx));
      setActiveMove(null);
    }
  }, [moveIndex, moveHistory, rebuildGame]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  useEffect(() => {
    const currentBaseFen = getBaseFen(game.fen());
    const newArrows = [];
    const seenMoves = new Set(); 

    const drillsToCheck = selectedCourse ? selectedCourse.drills : courses.flatMap(c => c.drills);

    drillsToCheck.forEach(drill => {
      if (!drill.lepesek) return;
      const drillMoves = drill.lepesek.split(',').map(m => m.trim()).filter(Boolean);
      const tempBoard = new Chess(); 
      
      if (getBaseFen(tempBoard.fen()) === currentBaseFen && drillMoves.length > 0) {
        const nextSan = drillMoves[0];
        if (!seenMoves.has(nextSan)) {
          seenMoves.add(nextSan);
          try {
            const testGame = new Chess(game.fen());
            const moveObj = testGame.move(nextSan);
            if (moveObj) newArrows.push([moveObj.from, moveObj.to, 'rgba(34, 197, 94, 0.8)']);
          } catch(e) {}
        }
      }

      for (let i = 0; i < drillMoves.length; i++) {
        try {
          tempBoard.move(drillMoves[i]);
          if (getBaseFen(tempBoard.fen()) === currentBaseFen) {
            if (i + 1 < drillMoves.length) {
              const nextSan = drillMoves[i + 1];
              if (!seenMoves.has(nextSan)) {
                seenMoves.add(nextSan);
                const testGame = new Chess(game.fen());
                const moveObj = testGame.move(nextSan);
                if (moveObj) newArrows.push([moveObj.from, moveObj.to, 'rgba(34, 197, 94, 0.8)']);
              }
            }
          }
        } catch (e) { break; }
      }
    });

    setArrows(newArrows);
  }, [fen, selectedCourse, courses, game]); 

  // --- Legális lépések számítása ---
  function getMoveOptions(square) {
    if (settings?.showLegalMoves === false) return;

    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares = {};
    moves.forEach((m) => {
      const isCapture = game.get(m.to) && game.get(m.to).color !== game.get(square).color;
      newSquares[m.to] = {
        background: isCapture 
          ? 'radial-gradient(transparent 0%, transparent 74%, rgba(0,0,0,.2) 75%)'
          : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 26%)',
        borderRadius: '50%'
      };
    });
    newSquares[square] = { background: 'rgba(255, 255, 51, 0.5)' };
    setOptionSquares(newSquares);
  }

  function onPieceDragBegin(piece, sourceSquare) {
    getMoveOptions(sourceSquare);
  }

  function onSquareClick(square) {
    if (settings?.showLegalMoves === false) return;
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      getMoveOptions(square);
    } else {
      setOptionSquares({});
    }
  }

  function onDrop(sourceSquare, targetSquare) {
    setOptionSquares({});
    try {
      const testGame = new Chess(game.fen());
      const move = testGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

      if (!move) return false;
      
      const newHistory = [...moveHistory.slice(0, moveIndex), move.san];
      setMoveHistory(newHistory);
      setMoveIndex(newHistory.length);
      
      setGame(testGame);
      setFen(testGame.fen());
      setActiveMove(null);
      return true;
    } catch (e) {
      return false;
    }
  }

  function playMoveSequence(lepesekString, targetIndex, drillId) {
    const moves = lepesekString.split(',').map(m => m.trim()).filter(Boolean);
    setMoveHistory(moves);
    setMoveIndex(targetIndex + 1);
    rebuildGame(moves.slice(0, targetIndex + 1));
    setActiveMove(`${drillId}-${targetIndex}`);
  }

  function resetBoard() {
    setMoveHistory([]);
    setMoveIndex(0);
    rebuildGame([]);
    setActiveMove(null);
    setOptionSquares({});
  }

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.cim.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const currentBaseFen = getBaseFen(game.fen());
    if (currentBaseFen === getBaseFen(new Chess().fen())) return true;

    return c.drills.some(drill => {
      const tempBoard = new Chess();
      if (getBaseFen(tempBoard.fen()) === currentBaseFen) return true;
      
      const moves = drill.lepesek.split(',').map(m => m.trim()).filter(Boolean);
      for (let m of moves) {
        try {
          tempBoard.move(m);
          if (getBaseFen(tempBoard.fen()) === currentBaseFen) return true;
        } catch(e) { break; }
      }
      return false;
    });
  });

  return (
    <div className="center-container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Főmenü</button>
        <h2 style={{ margin: 0, color: 'var(--primary-blue)' }}>🔍 Megnyitás Explorer</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        <div className="card" style={{ padding: '20px' }}>
          <Chessboard 
            position={fen} 
            onPieceDrop={onDrop}
            onPieceDragBegin={onPieceDragBegin}
            onSquareClick={onSquareClick}
            customDarkSquareStyle={darkSquareStyle}
            customLightSquareStyle={lightSquareStyle}
            customPieces={customPieces} 
            customArrows={arrows} 
            showBoardNotation={settings?.showCoordinates ?? true}
            customSquareStyles={optionSquares}
            animationDuration={200}
          />
          
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button 
              className="btn-outline" 
              onClick={handlePrev} 
              disabled={moveIndex === 0}
              style={{ padding: '10px 15px', opacity: moveIndex === 0 ? 0.5 : 1, cursor: moveIndex === 0 ? 'not-allowed' : 'pointer' }}
            >
              ◀️
            </button>
            <button 
              className="btn-outline" 
              onClick={handleNext} 
              disabled={moveIndex === moveHistory.length}
              style={{ padding: '10px 15px', opacity: moveIndex === moveHistory.length ? 0.5 : 1, cursor: moveIndex === moveHistory.length ? 'not-allowed' : 'pointer' }}
            >
              ▶️
            </button>
            <button className="btn-outline" onClick={resetBoard}>
              🔄 Alaphelyzet
            </button>
          </div>
        </div>

        <div className="card" style={{ height: '540px', display: 'flex', flexDirection: 'column' }}>
          {!selectedCourse ? (
            <>
              <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                Közösségi Megnyitások {moveIndex > 0 && <span style={{ fontSize: '12px', color: 'var(--primary-blue)' }}>(Szűrve az állásra)</span>}
              </h3>
              <input 
                type="text" 
                className="input-field"
                placeholder="Keresés a megnyitások között..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: '15px' }}
              />
              
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map(course => (
                    <div 
                      key={course.id} 
                      onClick={() => setSelectedCourse(course)}
                      style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background 0.2s', borderRadius: '4px' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--light-blue)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <strong style={{ display: 'block', fontSize: '16px', color: 'var(--primary-blue)' }}>{course.cim}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{course.drills?.length || 0} variáció tartalmazza</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '20px' }}>Ebben a pozícióban nincs ismert folytatás.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setSelectedCourse(null)}>
                  🔙 Vissza
                </button>
                <h3 style={{ margin: 0, fontSize: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedCourse.cim}
                </h3>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                {selectedCourse.drills && selectedCourse.drills.length > 0 ? (
                  selectedCourse.drills.map((drill, dIdx) => (
                    <div key={drill.id || dIdx} style={{ marginBottom: '25px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)' }}>{drill.nev}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {drill.lepesek.split(',').map(m => m.trim()).filter(Boolean).map((move, mIdx) => {
                          const isWhite = mIdx % 2 === 0;
                          const moveNumber = Math.floor(mIdx / 2) + 1;
                          const isActive = activeMove === `${drill.id || dIdx}-${mIdx}`;
                          
                          return (
                            <React.Fragment key={mIdx}>
                              {isWhite && <span style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: '28px', marginLeft: '4px' }}>{moveNumber}.</span>}
                              <button
                                style={{
                                  padding: '4px 8px',
                                  border: isActive ? '2px solid var(--primary-blue)' : '1px solid #ccc',
                                  background: isActive ? 'var(--light-blue)' : '#f9f9f9',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: isActive ? 'bold' : 'normal',
                                  fontSize: '14px'
                                }}
                                onClick={() => playMoveSequence(drill.lepesek, mIdx, drill.id || dIdx)}
                              >
                                {move}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center' }}>Nincsenek elérhető variációk.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}