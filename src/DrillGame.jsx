import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { boardThemes, getCustomPieces } from './chessConfig';

export default function DrillGame({ drill, settings, onComplete, onBack, currentIndex, totalDrills }) {
  const [game, setGame] = useState(new Chess());
  const drillLépések = drill.lepesek.split(',');
  const [lépésIndex, setLépésIndex] = useState(0);
  const [hibák, setHibák] = useState(0);
  const [hint, setHint] = useState(null);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [wrongMove, setWrongMove] = useState(null);

  const [isBotMoving, setIsBotMoving] = useState(false);
  const [preMoveVisual, setPreMoveVisual] = useState(null);
  const preMoveRef = useRef(null);

  // A Lichess-stílusú "vizuális csalás"
  const getVisualPosition = () => {
    if (preMoveVisual) {
      const tempGame = new Chess(game.fen());
      try {
        tempGame.move({ from: preMoveVisual.source, to: preMoveVisual.target, promotion: 'q' });
        return tempGame.fen();
      } catch (e) { return game.fen(); }
    }
    return game.fen();
  };

  function handlePrev() {
    if (lépésIndex > 0 && !isCompleted && !wrongMove && !isBotMoving) {
      const newIdx = lépésIndex - 1;
      setLépésIndex(newIdx);
      setGame(new Chess(history[newIdx].fen));
      setRightClickedSquares({});
      preMoveRef.current = null;
      setPreMoveVisual(null);
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

  function onSquareClick() {
    setRightClickedSquares({});
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
      setHint(null);
      setTimeout(() => { setGame(new Chess(prevFen)); setWrongMove(null); }, 600);
      return true; 
    }

    const updatedHistory = currentHistory.slice(0, currentIndex + 1);
    updatedHistory.push({ fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } });
    
    setGame(gameCopy);
    setHistory(updatedHistory);
    setLépésIndex(updatedHistory.length - 1);
    setHint(null);
    setRightClickedSquares({});

    if (updatedHistory.length - 1 >= drillLépések.length) {
      setIsCompleted(true);
      return true;
    }

    setIsBotMoving(true);
    return true;
  }

  function onDrop(source, target) {
    if (isCompleted || wrongMove) return false;
    
    if (isBotMoving) {
      // Lichess pre-move: rögzítjük a szándékot
      preMoveRef.current = { source, target };
      setPreMoveVisual({ source, target });
      return true; 
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
          executeUserMove(pm.source, pm.target, newGame, finalHistory, newIndex);
        }
      }, settings.botDelay);
      return () => clearTimeout(timer);
    }
  }, [isBotMoving, game, history, lépésIndex, drillLépések, isCompleted, settings.botDelay]);

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' }, [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const wrongMoveSquares = wrongMove ? { [wrongMove]: { backgroundColor: 'rgba(255, 0, 0, 0.4)' } } : {};
  const preMoveStyles = preMoveVisual ? { [preMoveVisual.source]: { backgroundColor: 'rgba(255, 255, 0, 0.6)' }, [preMoveVisual.target]: { backgroundColor: 'rgba(255, 255, 0, 0.6)' } } : {};
  const customSquareStyles = { ...moveSquares, ...rightClickedSquares, ...wrongMoveSquares, ...preMoveStyles };

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
          onSquareRightClick={onSquareRightClick}
          onSquareClick={onSquareClick}
          customSquareStyles={customSquareStyles}
          customDarkSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.dark }}
          customLightSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.light }}
          customPieces={getCustomPieces(settings?.pieceStyle)}
          boardOrientation={drill.nev.toLowerCase().includes('black') ? 'black' : 'white'} 
        />
      </div>
      
      {isCompleted ? (
        <div className="card" style={{ marginTop: '20px' }}>
          <button className="btn-primary" onClick={() => onComplete(hibák)} style={{ width: '100%' }}>
            {currentIndex + 1 < totalDrills ? 'Következő Drill ⏭' : 'Eredmények 📊'}
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: '20px', padding: '15px' }}>
          <p style={{ color: '#EF4444', height: '20px', fontWeight: 'bold' }}>{hint && `Tipp: ${hint}`}</p>
          <button className="btn-outline" onClick={() => { if(drillLépések[lépésIndex]) { setHint(drillLépések[lépésIndex]); setHibák(prev => prev + 1); } }}>💡 Hint</button>
        </div>
      )}
    </div>
  );
}