import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { boardThemes, getCustomPieces } from './chessConfig';

export default function DrillGame({ drill, settings, onComplete, onBack, currentIndex, totalDrills }) {
  const [game, setGame] = useState(new Chess());
  const drillLépések = drill.lepesek.split(',').map(m => m.trim()).filter(Boolean);
  
  const [lépésIndex, setLépésIndex] = useState(0);
  const [hibák, setHibák] = useState(0);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [hintLevel, setHintLevel] = useState(0); 
  const [hintMove, setHintMove] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [moveFrom, setMoveFrom] = useState('');
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [wrongMove, setWrongMove] = useState(null);

  const [isBotMoving, setIsBotMoving] = useState(false);
  const [preMoveVisual, setPreMoveVisual] = useState(null);
  const preMoveRef = useRef(null);

  const getVisualPosition = () => {
    if (preMoveVisual) {
      try {
        const tempGame = new Chess(game.fen());
        const piece = tempGame.get(preMoveVisual.source);
        if (piece) {
          tempGame.remove(preMoveVisual.source);
          tempGame.put(piece, preMoveVisual.target);
          return tempGame.fen();
        }
      } catch (e) {
        return game.fen();
      }
    }
    return game.fen();
  };

  function resetHints() {
    setHintLevel(0);
    setHintMove(null);
    setOptionSquares({});
    setMoveFrom('');
  }

  function handlePrev() {
    if (lépésIndex > 0 && !isCompleted && !wrongMove && !isBotMoving) {
      const newIdx = lépésIndex - 1;
      setLépésIndex(newIdx);
      setGame(new Chess(history[newIdx].fen));
      setRightClickedSquares({});
      preMoveRef.current = null;
      setPreMoveVisual(null);
      resetHints();
    }
  }

  function handleNext() {
    if (lépésIndex < history.length - 1 && !isCompleted && !wrongMove && !isBotMoving) {
      const newIdx = lépésIndex + 1;
      setLépésIndex(newIdx);
      setGame(new Chess(history[newIdx].fen));
      setRightClickedSquares({});
      preMoveRef.current = null;
      setPreMoveVisual(null);
      resetHints();
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lépésIndex, history, isCompleted, wrongMove, isBotMoving]);

  useEffect(() => {
    if (lépésIndex === 0 && drill.nev.toLowerCase().includes('black') && !isBotMoving) {
      setIsBotMoving(true);
    }
  }, [drill, lépésIndex, isBotMoving]);

  // Vizuális pöttyök generálása (A gyalogok 3 mezős pre-move-jával kibővítve)
  function getMoveOptions(square) {
    if (settings?.showLegalMoves === false) return;
    const newSquares = {};
    const playerColor = isBotMoving ? (game.turn() === 'w' ? 'b' : 'w') : game.turn();

    const addMovesToSquares = (tempGame) => {
      const moves = tempGame.moves({ square, verbose: true });
      moves.forEach((m) => {
        const targetPiece = tempGame.get(m.to);
        const isCapture = targetPiece && targetPiece.color !== playerColor;
        if (isCapture) {
          newSquares[m.to] = { boxShadow: 'inset 0 0 0 6px rgba(0,0,0,.2)', borderRadius: '50%' };
        } else if (!newSquares[m.to] || !newSquares[m.to].boxShadow) {
          newSquares[m.to] = { background: 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 26%)', borderRadius: '50%' };
        }
      });
    };

    if (isBotMoving) {
      try {
        const tokens = game.fen().split(' ');
        tokens[1] = playerColor;
        tokens[3] = '-';
        addMovesToSquares(new Chess(tokens.join(' ')));
      } catch(e) {}

      try {
        const tempFuture = new Chess(game.fen());
        tempFuture.move(drillLépések[lépésIndex]);
        addMovesToSquares(tempFuture);
      } catch(e) {}

      // ÚJ: A gyalogok 3 előtte lévő mezőjének manuális engedélyezése pre-move alatt
      const piece = game.get(square);
      if (piece && piece.type === 'p' && piece.color === playerColor) {
        const sCol = square.charCodeAt(0);
        const sRow = parseInt(square[1], 10);
        const dir = piece.color === 'w' ? 1 : -1;
        const startRow = piece.color === 'w' ? 2 : 7;

        const addDot = (c, r) => {
          if (c >= 97 && c <= 104 && r >= 1 && r <= 8) {
            const sq = String.fromCharCode(c) + r;
            if (!newSquares[sq]) {
              newSquares[sq] = { background: 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 26%)', borderRadius: '50%' };
            }
          }
        };

        addDot(sCol - 1, sRow + dir); // Bal átló
        addDot(sCol, sRow + dir);     // Előre 1
        addDot(sCol + 1, sRow + dir); // Jobb átló
        if (sRow === startRow) addDot(sCol, sRow + 2 * dir); // Előre 2
      }
    } else {
      addMovesToSquares(game);
    }

    if (Object.keys(newSquares).length > 0) {
      newSquares[square] = { background: 'rgba(255, 255, 51, 0.5)' };
      setOptionSquares(newSquares);
    } else {
      setOptionSquares({});
    }
  }

  function onPieceDragBegin(piece, sourceSquare) {
    setMoveFrom(sourceSquare);
    getMoveOptions(sourceSquare);
  }

  // Ellenőrzi, hogy a lépés valamilyen formában lehetséges-e (vagy jövőben, vagy pszeudo-legálisan)
  function checkPreMoveValidity(source, target) {
    const playerColor = game.turn() === 'w' ? 'b' : 'w';
    let valid = false;

    try {
      const tokens = game.fen().split(' ');
      tokens[1] = playerColor;
      tokens[3] = '-';
      if (new Chess(tokens.join(' ')).move({ from: source, to: target, promotion: 'q' })) valid = true;
    } catch(e) {}

    try {
      const tempFuture = new Chess(game.fen());
      tempFuture.move(drillLépések[lépésIndex]);
      if (tempFuture.move({ from: source, to: target, promotion: 'q' })) valid = true;
    } catch(e) {}

    // ÚJ: Gyalog manuális elfogadása az előtte lévő 3 mezőre pre-move-ként
    if (!valid) {
      const piece = game.get(source);
      if (piece && piece.type === 'p' && piece.color === playerColor) {
        const sCol = source.charCodeAt(0);
        const sRow = parseInt(source[1], 10);
        const tCol = target.charCodeAt(0);
        const tRow = parseInt(target[1], 10);
        const dir = piece.color === 'w' ? 1 : -1;
        const startRow = piece.color === 'w' ? 2 : 7;

        if (tRow === sRow + dir && Math.abs(tCol - sCol) <= 1) valid = true;
        if (sCol === tCol && sRow === startRow && tRow === sRow + 2 * dir) valid = true;
      }
    }

    return valid;
  }

  function onSquareClick(square) {
    setRightClickedSquares({});
    if (isCompleted || wrongMove) return;

    if (moveFrom === square) {
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    const playerColor = isBotMoving ? (game.turn() === 'w' ? 'b' : 'w') : game.turn();

    if (moveFrom) {
      let isValidMove = false;
      
      if (isBotMoving) {
        isValidMove = checkPreMoveValidity(moveFrom, square);
      } else {
        try {
          if (new Chess(game.fen()).move({ from: moveFrom, to: square, promotion: 'q' })) isValidMove = true;
        } catch(e) {}
      }

      if (isValidMove) {
        onDrop(moveFrom, square);
        return;
      }
      
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setMoveFrom(square);
        if (settings?.showLegalMoves !== false) getMoveOptions(square);
      } else {
        setMoveFrom('');
        setOptionSquares({});
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setMoveFrom(square);
        if (settings?.showLegalMoves !== false) getMoveOptions(square);
      } else {
        setOptionSquares({});
      }
    }
  }

  function onSquareRightClick(square) {
    preMoveRef.current = null;
    setPreMoveVisual(null);
    setRightClickedSquares((prev) => {
      const newSquares = { ...prev };
      if (newSquares[square]) delete newSquares[square];
      else newSquares[square] = { backgroundColor: 'rgba(235, 97, 80, 0.8)' };
      return newSquares;
    });
  }

  function executeUserMove(source, target, currentGame, currentHistory, currentIndex) {
    const gameCopy = new Chess(currentGame.fen());
    let move = null;
    try { move = gameCopy.move({ from: source, to: target, promotion: 'q' }); } 
    catch(e) { return false; } 

    if (!move) return false;

    if (move.san !== drillLépések[currentIndex]) {
      setHibák(prev => prev + 1);
      const prevFen = currentGame.fen();
      setGame(gameCopy);
      setWrongMove(target);
      setTimeout(() => { setGame(new Chess(prevFen)); setWrongMove(null); }, 600);
      return true; 
    }

    const updatedHistory = currentHistory.slice(0, currentIndex + 1);
    updatedHistory.push({ fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } });
    
    setGame(gameCopy);
    setHistory(updatedHistory);
    setLépésIndex(updatedHistory.length - 1);
    setRightClickedSquares({});
    resetHints();

    if (updatedHistory.length - 1 >= drillLépések.length) {
      setIsCompleted(true);
      return true;
    }

    setIsBotMoving(true);
    return true;
  }

  function onDrop(source, target) {
    if (source === target) {
      setMoveFrom(source);
      if (settings?.showLegalMoves !== false) getMoveOptions(source);
      return false;
    }

    setOptionSquares({}); 
    setMoveFrom('');

    if (isCompleted || wrongMove) return false;
    
    if (isBotMoving) {
      if (checkPreMoveValidity(source, target)) {
        preMoveRef.current = { source, target }; 
        setPreMoveVisual({ source, target }); 
        return true; 
      }
      return false;
    }
    
    return executeUserMove(source, target, game, history, lépésIndex);
  }

  useEffect(() => {
    if (isBotMoving && !isCompleted) {
      const timer = setTimeout(() => {
        const gameCopy = new Chess(game.fen());
        let botMove;
        try { botMove = gameCopy.move(drillLépések[lépésIndex]); } 
        catch(e) { setIsBotMoving(false); return; }
        
        const finalHistory = [...history, { fen: gameCopy.fen(), lastMove: { from: botMove.from, to: botMove.to } }];
        const newGame = new Chess(gameCopy.fen());
        setGame(newGame);
        setHistory(finalHistory);
        
        const newIndex = lépésIndex + 1;
        setLépésIndex(newIndex);
        setIsBotMoving(false);
        
        if (newIndex >= drillLépések.length) {
          setIsCompleted(true);
        } else if (preMoveRef.current) {
          const pm = preMoveRef.current;
          preMoveRef.current = null;
          setPreMoveVisual(null);
          // Ha illegális lenne (mert a bot nem lépett a várt átlóra), itt némán meghiúsul és visszaugrik
          executeUserMove(pm.source, pm.target, newGame, finalHistory, newIndex);
        }
      }, settings.botDelay);
      return () => clearTimeout(timer);
    }
  }, [isBotMoving, game, history, lépésIndex, drillLépések, isCompleted, settings.botDelay]);

  function handleHintClick() {
    const currentSan = drillLépések[lépésIndex];
    if (!currentSan) return;

    if (hintLevel === 0) {
      const tempGame = new Chess(game.fen());
      try {
        const m = tempGame.move(currentSan);
        if (m) {
          setHintMove({ from: m.from, to: m.to });
          setHintLevel(1);
          setHibák(prev => prev + 1);
        }
      } catch (e) {}
    } else if (hintLevel === 1) {
      setHintLevel(2);
      setHibák(prev => prev + 1);
    }
  }

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' }, [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const wrongMoveSquares = wrongMove ? { [wrongMove]: { backgroundColor: 'rgba(255, 0, 0, 0.4)' } } : {};
  const preMoveStyles = preMoveVisual ? { [preMoveVisual.source]: { backgroundColor: 'rgba(255, 255, 0, 0.6)' }, [preMoveVisual.target]: { backgroundColor: 'rgba(255, 255, 0, 0.6)' } } : {};
  const hintSquareStyle = hintLevel >= 1 && hintMove ? { [hintMove.from]: { backgroundColor: 'rgba(59, 130, 246, 0.6)' } } : {};
  const clickSelectStyle = moveFrom ? { [moveFrom]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};

  const customSquareStyles = { 
    ...moveSquares, 
    ...rightClickedSquares, 
    ...wrongMoveSquares, 
    ...preMoveStyles, 
    ...hintSquareStyle,
    ...optionSquares,
    ...clickSelectStyle
  };
  
  const customArrows = hintLevel === 2 && hintMove ? [[hintMove.from, hintMove.to, 'rgba(59, 130, 246, 0.8)']] : [];

  return (
    <div style={{ width: '500px', margin: '40px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Vissza</button>
        <strong>DRILL {currentIndex + 1} / {totalDrills}</strong>
      </div>

      <div style={{ boxShadow: 'var(--shadow-md)', borderRadius: '4px', overflow: 'hidden' }}>
        <Chessboard 
          position={getVisualPosition()} 
          onPieceDrop={onDrop} 
          onPieceDragBegin={onPieceDragBegin}
          onSquareClick={onSquareClick}
          onSquareRightClick={onSquareRightClick}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows}
          customDarkSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.dark }}
          customLightSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.light }}
          customPieces={getCustomPieces(settings?.pieceStyle)}
          boardOrientation={drill.nev.toLowerCase().includes('black') ? 'black' : 'white'} 
          showBoardNotation={settings?.showCoordinates ?? true}
        />
      </div>

      {!isCompleted && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
          <button className="btn-outline" onClick={handlePrev} disabled={lépésIndex === 0 || isBotMoving || wrongMove} style={{ padding: '8px 20px', opacity: (lépésIndex === 0 || isBotMoving || wrongMove) ? 0.5 : 1, cursor: (lépésIndex === 0 || isBotMoving || wrongMove) ? 'not-allowed' : 'pointer', border: '1px solid var(--primary-blue)' }}>◀️</button>
          <button className="btn-outline" onClick={handleNext} disabled={lépésIndex === history.length - 1 || isBotMoving || wrongMove} style={{ padding: '8px 20px', opacity: (lépésIndex === history.length - 1 || isBotMoving || wrongMove) ? 0.5 : 1, cursor: (lépésIndex === history.length - 1 || isBotMoving || wrongMove) ? 'not-allowed' : 'pointer', border: '1px solid var(--primary-blue)' }}>▶️</button>
        </div>
      )}
      
      {isCompleted ? (
        <div className="card" style={{ marginTop: '20px' }}>
          <button className="btn-primary" onClick={() => onComplete(hibák)} style={{ width: '100%' }}>{currentIndex + 1 < totalDrills ? 'Következő Drill ⏭' : 'Eredmények 📊'}</button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: '20px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p style={{ margin: 0, height: '20px', fontWeight: 'bold', color: hintLevel > 0 ? 'var(--primary-blue)' : 'transparent' }}>{hintLevel === 1 && '💡 Mozgasd a kiemelt bábut!'}{hintLevel === 2 && '🎯 Kövesd a nyilat a helyes lépéshez!'}</p>
          <button className="btn-outline" onClick={handleHintClick} disabled={hintLevel === 2} style={{ opacity: hintLevel === 2 ? 0.5 : 1, cursor: hintLevel === 2 ? 'not-allowed' : 'pointer', borderColor: hintLevel === 1 ? '#F59E0B' : 'var(--primary-blue)', color: hintLevel === 1 ? '#F59E0B' : 'var(--primary-blue)' }}>
            {hintLevel === 0 ? '💡 Bábu felfedése (Tipp)' : hintLevel === 1 ? '🎯 Pontos célpont (Újabb Tipp)' : '✅ Megoldás felfedve'}
          </button>
        </div>
      )}
    </div>
  );
}