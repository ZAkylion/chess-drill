import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from './supabaseClient';
import { boardThemes, getCustomPieces } from './chessConfig';
import { translations } from './translations';

export default function VariationExplorer({ onBack, settings }) {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);
  const [lépésIndex, setLépésIndex] = useState(0);
  const [allVariations, setAllVariations] = useState([]);
  const [optionSquares, setOptionSquares] = useState({});
  const [moveFrom, setMoveFrom] = useState('');

  const lang = settings?.language || 'hu';
  const t = translations[lang];

  const customPieces = useMemo(() => getCustomPieces(settings?.pieceStyle), [settings?.pieceStyle]);

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase.from('variaciok').select('*').eq('allapot', 'publikus');
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

  // ÚJ 1: Létrehozunk egy globális Pozíció Térképet (Position Map) az összes variációból
  const positionMap = useMemo(() => {
    const map = {};
    const exact = {};

    allVariations.forEach(drill => {
      const tempGame = new Chess();
      const moves = drill.lepesek.split(',');

      // Az első 4 szegmens a FEN-ből (bábuk, lépésjog, sánc, en passant)
      let currentBaseFen = tempGame.fen().split(' ').slice(0, 4).join(' ');

      moves.forEach((moveSan) => {
        // Regisztráljuk, hogy ebből a pozícióból ez a lépés elérhető
        if (!map[currentBaseFen]) map[currentBaseFen] = {};
        if (!map[currentBaseFen][moveSan]) map[currentBaseFen][moveSan] = { count: 0, authors: new Set() };
        
        map[currentBaseFen][moveSan].count++;
        map[currentBaseFen][moveSan].authors.add(drill.szerzo_nev);

        // Lépünk a táblán, hogy megkapjuk a következő FEN-t
        try {
          tempGame.move(moveSan);
          currentBaseFen = tempGame.fen().split(' ').slice(0, 4).join(' ');
        } catch (e) {
          console.warn("Hibás lépés a variációban:", drill.nev, moveSan);
        }
      });

      // Amikor a variáció véget ér, feljegyezzük, hogy ez egy "kifutó" pozíció
      if (!exact[currentBaseFen]) exact[currentBaseFen] = [];
      exact[currentBaseFen].push(drill);
    });

    return { map, exact };
  }, [allVariations]);

  // ÚJ 2: Az elérhető lépéseket a Position Map-ből olvassuk ki a jelenlegi pozíció alapján (Transzpozíciók felismerése)
  const elerhetoLepesek = useMemo(() => {
    // Levágjuk a jelenlegi állásból a lépésszámlálókat, hogy csak a tiszta pozíciót vizsgáljuk
    const currentBaseFen = game.fen().split(' ').slice(0, 4).join(' ');

    const nextMovesData = positionMap.map[currentBaseFen] || {};
    const exactMatches = positionMap.exact[currentBaseFen] || [];

    const options = Object.entries(nextMovesData).map(([san, data]) => ({
      san,
      count: data.count,
      authors: Array.from(data.authors).join(', ')
    })).sort((a, b) => b.count - a.count);

    return { options, exactMatches };
  }, [positionMap, game.fen()]);

  // ÚJ 3: Nyilak generálása az ELÉRHETŐ lépések alapján (Már transzpozíciót is kezeli)
  const explorerArrows = useMemo(() => {
    const arrows = [];
    elerhetoLepesek.options.forEach(opt => {
      const tempGame = new Chess(game.fen());
      try {
        const move = tempGame.move(opt.san);
        if (move) {
          arrows.push([move.from, move.to]);
        }
      } catch (e) {}
    });
    return arrows;
  }, [elerhetoLepesek, game.fen()]);

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
      if (isCapture) {
        newSquares[m.to] = { boxShadow: 'inset 0 0 0 6px rgba(0,0,0,.2)', borderRadius: '50%' };
      } else {
        newSquares[m.to] = { background: 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 26%)', borderRadius: '50%' };
      }
    });
    newSquares[square] = { background: 'rgba(255, 255, 51, 0.5)' };
    setOptionSquares(newSquares);
  }

  function onPieceDragBegin(piece, sourceSquare) {
    setMoveFrom(sourceSquare);
    getMoveOptions(sourceSquare);
  }

  function onSquareClick(square) {
    if (moveFrom === square) {
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    if (moveFrom) {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) {
        onDrop(moveFrom, square);
        return;
      }
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        if (settings?.showLegalMoves !== false) getMoveOptions(square);
      } else {
        setMoveFrom('');
        setOptionSquares({});
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        if (settings?.showLegalMoves !== false) getMoveOptions(square);
      } else {
        setOptionSquares({});
      }
    }
  }

  function onDrop(source, target) {
    if (source === target) {
      setMoveFrom(source);
      if (settings?.showLegalMoves !== false) getMoveOptions(source);
      return false;
    }

    setOptionSquares({});
    setMoveFrom('');
    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({ from: source, to: target, promotion: 'q' });
    if (move) {
      setGame(gameCopy);
      const newHistory = [...history.slice(0, lépésIndex + 1), { fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } }];
      setHistory(newHistory);
      setLépésIndex(newHistory.length - 1);
    }
    return !!move;
  }

  function handlePrev() {
    if (lépésIndex > 0) {
      setLépésIndex(lépésIndex - 1);
      setGame(new Chess(history[lépésIndex - 1].fen));
      setOptionSquares({});
      setMoveFrom('');
    }
  }

  function handleNext() {
    if (lépésIndex < history.length - 1) {
      setLépésIndex(lépésIndex + 1);
      setGame(new Chess(history[lépésIndex + 1].fen));
      setOptionSquares({});
      setMoveFrom('');
    }
  }

  function loadVariation(movesStr) {
    const moves = movesStr.split(',');
    const tempGame = new Chess();
    const newHistory = [{ fen: tempGame.fen(), lastMove: null }];
    moves.forEach(m => {
      const res = tempGame.move(m);
      if (res) newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to } });
    });
    setGame(tempGame);
    setHistory(newHistory);
    setLépésIndex(newHistory.length - 1);
    setOptionSquares({});
    setMoveFrom('');
  }

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' }, [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const clickSelectStyle = moveFrom ? { [moveFrom]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const customSquareStyles = { ...moveSquares, ...optionSquares, ...clickSelectStyle };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>{t.backToMenu}</button>
        <h2>{t.currentPosition}</h2>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* Sakktábla */}
        <div style={{ width: '500px' }}>
          <div style={{ boxShadow: 'var(--shadow-md)', borderRadius: '4px', overflow: 'hidden' }}>
            <Chessboard 
              position={game.fen()} 
              onPieceDrop={onDrop}
              onPieceDragBegin={onPieceDragBegin}
              onSquareClick={onSquareClick}
              customPieces={customPieces}
              customArrows={explorerArrows}
              customArrowColor="rgba(76, 175, 80, 0.6)"
              customDarkSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'classic']?.dark }}
              customLightSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'classic']?.light }}
              showBoardNotation={settings?.showCoordinates ?? true}
              customSquareStyles={customSquareStyles}
            />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <button className="btn-outline" onClick={handlePrev} disabled={lépésIndex === 0} style={{ opacity: lépésIndex === 0 ? 0.5 : 1 }}>◀️</button>
            <button className="btn-outline" onClick={handleNext} disabled={lépésIndex === history.length - 1} style={{ opacity: lépésIndex === history.length - 1 ? 0.5 : 1 }}>▶️</button>
            <button className="btn-outline" onClick={() => loadVariation('')}>{t.resetBtn}</button>
          </div>
        </div>

        {/* Lépések / Változatok listája */}
        <div className="card" style={{ width: '400px', alignSelf: 'flex-start', maxHeight: '550px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary-blue)', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
            {t.availableMoves}
          </h3>

          {elerhetoLepesek.options.length === 0 && elerhetoLepesek.exactMatches.length === 0 ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '20px' }}>{t.noDataExplorer}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#F3F4F6', color: '#374151' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{t.moveCol}</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB' }}>{t.freqCol}</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #E5E7EB' }}>{t.authorCol}</th>
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

          {elerhetoLepesek.exactMatches.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: '#059669', marginBottom: '10px' }}>✅ Ide kifutó teljes variációk:</h4>
              {elerhetoLepesek.exactMatches.map((drill, i) => (
                <div key={i} style={{ padding: '10px', background: '#ECFDF5', borderRadius: '6px', marginBottom: '8px', border: '1px solid #A7F3D0', fontSize: '14px' }}>
                  <strong>{drill.nev}</strong> <span style={{ color: '#666', fontSize: '12px' }}>({drill.szerzo_nev})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}