import React, { useState, useEffect, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { boardThemes, getCustomPieces } from './chessConfig';

export default function VariationExplorer({ publicCourses = [], onBack, settings }) {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [activeMove, setActiveMove] = useState(null);
  
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [arrows, setArrows] = useState([]);

  const customPieces = useMemo(() => getCustomPieces(settings?.pieceStyle), [settings?.pieceStyle]);
  const darkSquareStyle = { backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.dark };
  const lightSquareStyle = { backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.light };

  // NYILAK KISZÁMÍTÁSA
  useEffect(() => {
    // Ha nincs kiválasztva kurzus, vagy nincsenek benne drillek, töröljük a nyilakat
    if (!selectedCourse || !selectedCourse.drills || selectedCourse.drills.length === 0) {
      setArrows([]);
      return;
    }

    const currentHistory = game.history(); // pl. ['e4', 'e5']
    const newArrows = [];
    const seenMoves = new Set(); 

    selectedCourse.drills.forEach(drill => {
      if (!drill.lepesek) return;

      // Szétválasztjuk a lépéseket, eltávolítjuk a szóközöket és az üres elemeket
      const drillMoves = drill.lepesek.split(',').map(m => m.trim()).filter(Boolean);

      // Ellenőrizzük, hogy a jelenlegi tábla egyezik-e a variáció eddigi lépéseivel
      let isMatch = true;
      for (let i = 0; i < currentHistory.length; i++) {
        if (drillMoves[i] !== currentHistory[i]) {
          isMatch = false;
          break;
        }
      }

      // Ha egyezik, és a variációnak van még következő lépése
      if (isMatch && drillMoves.length > currentHistory.length) {
        const nextSan = drillMoves[currentHistory.length]; // A következő lépés SAN formátumban (pl. 'Nf3')

        if (!seenMoves.has(nextSan)) {
          seenMoves.add(nextSan);
          try {
            // Egy átmeneti táblán kipróbáljuk a lépést, hogy megkapjuk a mezők koordinátáit
            const temp = new Chess(game.fen());
            const moveObj = temp.move(nextSan);
            if (moveObj) {
              // Hozzáadjuk a nyilat: [honnan, hova, szín]
              newArrows.push([moveObj.from, moveObj.to, 'rgba(34, 197, 94, 0.8)']);
            }
          } catch (e) {
            console.error(`Hiba a nyíl kiszámításakor (${nextSan}):`, e);
          }
        }
      }
    });

    console.log("Jelenlegi lépéstörténet:", currentHistory);
    console.log("Kiszámolt nyilak:", newArrows);
    setArrows(newArrows);

  }, [fen, selectedCourse, game]); // Akkor fut le újra, ha a FEN, a játék vagy a kurzus megváltozik

  function onDrop(sourceSquare, targetSquare) {
    try {
      // 100%-ig biztonságos játékmásolás a lépéstörténet megtartásával
      const gameCopy = new Chess();
      game.history().forEach(m => gameCopy.move(m));
      
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;
      
      setGame(gameCopy);
      setFen(gameCopy.fen());
      setActiveMove(null);
      return true;
    } catch (e) {
      return false;
    }
  }

  function playMoveSequence(lepesekString, targetIndex, drillId) {
    const newGame = new Chess();
    const moves = lepesekString.split(',').map(m => m.trim()).filter(Boolean);
    
    for (let i = 0; i <= targetIndex; i++) {
      if (moves[i]) {
        try { 
          newGame.move(moves[i]); 
        } 
        catch (e) { 
          console.error("Érvénytelen lépés a sorozatban:", moves[i]); 
        }
      }
    }
    
    setGame(newGame);
    setFen(newGame.fen());
    setActiveMove(`${drillId}-${targetIndex}`);
  }

  function resetBoard() {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setActiveMove(null);
  }

  const filteredCourses = publicCourses.filter(c => 
    c.cim.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Főmenü</button>
        <h2 style={{ margin: 0, color: 'var(--primary-blue)' }}>
          🔍 Megnyitás Explorer
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* SAKKTÁBLA */}
        <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <Chessboard 
            position={fen} 
            onPieceDrop={onDrop}
            customDarkSquareStyle={darkSquareStyle}
            customLightSquareStyle={lightSquareStyle}
            customPieces={customPieces} 
            customArrows={arrows} 
            animationDuration={200}
          />
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button className="btn-outline" onClick={resetBoard}>
              🔄 Tábla alaphelyzet
            </button>
          </div>
        </div>

        {/* MENÜ RÉSZ */}
        <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', height: '540px', display: 'flex', flexDirection: 'column' }}>
          
          {!selectedCourse ? (
            <>
              <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Publikus & Saját Megnyitások</h3>
              <input 
                type="text" 
                placeholder="Keresés a megnyitások között..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
              />
              
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map(course => (
                    <div 
                      key={course.id} 
                      onClick={() => { setSelectedCourse(course); resetBoard(); }}
                      style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background 0.2s', borderRadius: '4px' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <strong style={{ display: 'block', fontSize: '16px', color: 'var(--primary-blue)' }}>{course.cim}</strong>
                      <span style={{ fontSize: '12px', color: '#666' }}>{course.drills?.length || 0} variáció</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>Nincs találat.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <button 
                  className="btn-outline" 
                  style={{ padding: '4px 8px', fontSize: '12px' }} 
                  onClick={() => { setSelectedCourse(null); resetBoard(); }}
                >
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
                      <h4 style={{ margin: '0 0 10px 0', color: '#444' }}>{drill.nev}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {drill.lepesek.split(',').map(m => m.trim()).filter(Boolean).map((move, mIdx) => {
                          const isWhite = mIdx % 2 === 0;
                          const moveNumber = Math.floor(mIdx / 2) + 1;
                          const isActive = activeMove === `${drill.id || dIdx}-${mIdx}`;
                          
                          return (
                            <React.Fragment key={mIdx}>
                              {isWhite && <span style={{ color: '#888', fontSize: '13px', lineHeight: '28px', marginLeft: '4px' }}>{moveNumber}.</span>}
                              <button
                                style={{
                                  padding: '4px 8px',
                                  border: isActive ? '2px solid var(--primary-blue)' : '1px solid #ccc',
                                  background: isActive ? '#e0f0ff' : '#f9f9f9',
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
                  <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>Nincsenek elérhető variációk ebben a megnyitásban.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}