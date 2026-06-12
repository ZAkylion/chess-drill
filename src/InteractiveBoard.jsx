import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { boardThemes, getCustomPieces } from './chessConfig';

export default function InteractiveBoard({
  game,
  boardOrientation = 'white',
  settings,
  isBotMoving = false,
  onMoveAttempt,
  wrongMoveSquare = null,
  hintMove = null,
  hintLevel = 0,
  customSquareStyles = {},
  ...props
}) {
  const boardRef = useRef(null);
  
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [preMove, setPreMove] = useState(null);

  const [boardAnimDuration, setBoardAnimDuration] = useState(200);

  const [dragState, setDragState] = useState({
    isDragging: false,
    isSnappingBack: false,
    isSuccessDrop: false,
    isRestoring: false, 
    piece: null,
    source: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    hasMoved: false,
    wasSelected: false,
    pointerId: null,
  });

  const playerColor = boardOrientation === 'black' ? 'b' : 'w';

  useEffect(() => {
    setMoveFrom(''); setOptionSquares({}); setRightClickedSquares({}); setPreMove(null);
  }, [game, isBotMoving]);

  useEffect(() => {
    if (!isBotMoving && preMove) {
      const pm = preMove; setPreMove(null);
      if (onMoveAttempt) onMoveAttempt(pm.source, pm.target);
    }
  }, [isBotMoving, preMove, onMoveAttempt]);

  const getPremoveOptions = (sourceSquare) => {
    const piece = game.get(sourceSquare);
    if (!piece) return [];
    const fileStr = "abcdefgh";
    const startFile = fileStr.indexOf(sourceSquare[0]);
    const startRank = parseInt(sourceSquare[1], 10) - 1;
    const options = [];

    const addIfValid = (f, r) => { if (f >= 0 && f <= 7 && r >= 0 && r <= 7) options.push({ to: `${fileStr[f]}${r + 1}` }); };
    const addRays = (df, dr) => {
      let f = startFile + df; let r = startRank + dr;
      while (f >= 0 && f <= 7 && r >= 0 && r <= 7) { addIfValid(f, r); f += df; r += dr; }
    };

    switch (piece.type) {
      case 'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([df, dr]) => addIfValid(startFile + df, startRank + dr)); break;
      case 'k': 
        // 1. Szabványos 1 mezős lépések
        [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([df, dr]) => addIfValid(startFile + df, startRank + dr)); 
        
        // 2. Sáncolás (Castling) elméleti mezőinek hozzáadása pre-move-hoz
        if (piece.color === 'w' && sourceSquare === 'e1') {
          options.push({ to: 'g1' }, { to: 'c1' });
        } else if (piece.color === 'b' && sourceSquare === 'e8') {
          options.push({ to: 'g8' }, { to: 'c8' });
        }
        break;
      case 'r': addRays(1, 0); addRays(-1, 0); addRays(0, 1); addRays(0, -1); break;
      case 'b': addRays(1, 1); addRays(1, -1); addRays(-1, 1); addRays(-1, -1); break;
      case 'q': addRays(1, 0); addRays(-1, 0); addRays(0, 1); addRays(0, -1); addRays(1, 1); addRays(1, -1); addRays(-1, 1); addRays(-1, -1); break;
      case 'p':
        const dir = piece.color === 'w' ? 1 : -1;
        const startR = piece.color === 'w' ? 1 : 6;
        addIfValid(startFile, startRank + dir);
        if (startRank === startR) addIfValid(startFile, startRank + 2 * dir);
        addIfValid(startFile - 1, startRank + dir); addIfValid(startFile + 1, startRank + dir);
        break;
    }
    return options.map(opt => ({ to: opt.to, isCapture: game.get(opt.to) !== null }));
  };

  const getMoveOptions = (square) => {
    if (settings?.showLegalMoves === false) return;
    let validMoves = [];
    if (!isBotMoving) {
      const moves = game.moves({ square, verbose: true });
      validMoves = moves.map(m => ({ to: m.to, isCapture: game.get(m.to) && game.get(m.to).color !== game.get(square).color }));
    } else validMoves = getPremoveOptions(square);
    
    const newSquares = {};
    validMoves.forEach((m) => {
      if (m.isCapture) newSquares[m.to] = { boxShadow: 'inset 0 0 0 6px rgba(0,0,0,.2)', borderRadius: '50%' };
      else newSquares[m.to] = { background: 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 26%)', borderRadius: '50%' };
    });
    newSquares[square] = { backgroundColor: 'rgba(255, 255, 51, 0.5)' };
    setOptionSquares(newSquares);
  };

  const getSquareFromCoords = (clientX, clientY) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const squareSize = rect.width / 8;
    const fileIndex = Math.floor((clientX - rect.left) / squareSize);
    const rankIndex = Math.floor((clientY - rect.top) / squareSize);
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = boardOrientation === 'black' ? files[7 - fileIndex] : files[fileIndex];
    const rank = boardOrientation === 'black' ? rankIndex + 1 : 8 - rankIndex;
    return `${file}${rank}`;
  };

  const getCoordsFromSquare = (square) => {
    if (!boardRef.current || !square) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const squareSize = rect.width / 8;
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    let fileIndex = files.indexOf(square[0]);
    let rankIndex = 8 - parseInt(square[1], 10);
    if (boardOrientation === 'black') {
      fileIndex = 7 - fileIndex; rankIndex = parseInt(square[1], 10) - 1;
    }
    return { x: rect.left + fileIndex * squareSize + squareSize / 2, y: rect.top + rankIndex * squareSize + squareSize / 2 };
  };

  const handleCommitMove = (source, target) => {
    if (isBotMoving) {
      if (getPremoveOptions(source).some(m => m.to === target)) {
        setOptionSquares({}); setMoveFrom(''); setPreMove({ source, target }); return true;
      }
      return false;
    } else {
      if (onMoveAttempt && onMoveAttempt(source, target)) {
        setOptionSquares({}); setMoveFrom(''); return true;
      }
      return false;
    }
  };

  const resetDragState = () => {
    setDragState({ isDragging: false, isSnappingBack: false, isSuccessDrop: false, isRestoring: false, piece: null, source: null, x: 0, y: 0, startX: 0, startY: 0, hasMoved: false, wasSelected: false, pointerId: null });
  };

  const prevFenRef = useRef(game.fen());
  
  // A MEGOLDÁS KULCSA: A FEN frissítése után is tartjuk a maszkot 50ms-ig!
  useEffect(() => {
    if (game.fen() !== prevFenRef.current) {
      if (dragState.isSuccessDrop) {
        setTimeout(() => {
          resetDragState(); 
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setBoardAnimDuration(200);
            });
          });
        }, 50); // <-- Ez az az idő, ami alatt a sakktábla belső DOM-ja is biztosan betölt a helyére
      }
    }
    prevFenRef.current = game.fen();
  }, [game.fen(), dragState.isSuccessDrop]);

  useEffect(() => {
    let timer;
    if (dragState.isSuccessDrop) {
      timer = setTimeout(() => { resetDragState(); setBoardAnimDuration(200); }, 500); 
    }
    return () => clearTimeout(timer);
  }, [dragState.isSuccessDrop]);

  useEffect(() => {
    if (dragState.hasMoved) {
      setBoardAnimDuration(0);
    } else {
      const t = setTimeout(() => setBoardAnimDuration(200), 50);
      return () => clearTimeout(t);
    }
  }, [dragState.hasMoved]);

  const triggerSnapback = (source) => {
    const coords = getCoordsFromSquare(source);
    if (coords) {
      setDragState(prev => ({ ...prev, x: coords.x, y: coords.y, isSnappingBack: true }));
      setTimeout(() => { 
        setDragState(prev => {
          if (!prev.isSnappingBack) return prev;
          return { ...prev, isSnappingBack: false, isRestoring: true };
        });
        setMoveFrom(source); 
        getMoveOptions(source); 

        setTimeout(() => {
          setDragState(prev => prev.isRestoring ? { ...prev, isDragging: false, isRestoring: false, piece: null, source: null, x: 0, y: 0, startX: 0, startY: 0, hasMoved: false, wasSelected: false, pointerId: null } : prev);
        }, 100);

      }, 150);
    } else {
      resetDragState(); setMoveFrom(source); getMoveOptions(source);
    }
  };

  const handlePointerDown = (e) => {
    if (dragState.isDragging && !dragState.isRestoring) return;

    if (e.button === 2) { 
      const square = getSquareFromCoords(e.clientX, e.clientY);
      if (square) {
        setRightClickedSquares(prev => {
          const next = { ...prev };
          if (next[square]) delete next[square]; else next[square] = { backgroundColor: 'rgba(235, 97, 80, 0.8)' };
          return next;
        });
      }
      return;
    }
    if (e.button === 0) { 
      setRightClickedSquares({});
      const square = getSquareFromCoords(e.clientX, e.clientY);
      if (!square) return;
      const piece = game.get(square);
      const wasSelected = moveFrom === square;

      if (moveFrom && !wasSelected) {
        let isTargetValid = false;
        if (isBotMoving) {
          isTargetValid = getPremoveOptions(moveFrom).some(m => m.to === square);
        } else {
          const gameCopy = new Chess(game.fen());
          try { isTargetValid = gameCopy.move({ from: moveFrom, to: square, promotion: 'q' }) !== null; } catch(err){}
        }

        if (isTargetValid) {
          handleCommitMove(moveFrom, square);
          return;
        }
      }

      if (piece && piece.color === playerColor) {
        if (!wasSelected) { setMoveFrom(square); getMoveOptions(square); }
        try { boardRef.current.setPointerCapture(e.pointerId); } catch(err) {}
        setDragState({
          isDragging: true, isSnappingBack: false, isSuccessDrop: false, isRestoring: false, piece: piece, source: square,
          x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY,
          hasMoved: false, wasSelected: wasSelected, pointerId: e.pointerId,
        });
      } else {
        setMoveFrom(''); setOptionSquares({});
      }
    }
  };

  const stopDragging = (e) => {
    if (!dragState.isDragging || dragState.isSnappingBack || dragState.isSuccessDrop || dragState.isRestoring) return;
    try { if (e && boardRef.current && dragState.pointerId) boardRef.current.releasePointerCapture(dragState.pointerId); } catch(err) {}

    const target = e ? getSquareFromCoords(e.clientX, e.clientY) : null;
    const source = dragState.source;
    let success = false;
    
    if (target && target !== source) success = handleCommitMove(source, target);

    if (success) {
      if (dragState.hasMoved) {
        if (isBotMoving) {
          resetDragState();
        } else {
          setBoardAnimDuration(0);
          const targetCoords = getCoordsFromSquare(target);
          setDragState(prev => ({
            ...prev, x: targetCoords ? targetCoords.x : prev.x, y: targetCoords ? targetCoords.y : prev.y, isSuccessDrop: true
          }));
        }
      } else resetDragState();
    } else {
      if (!target || target === source) {
        if (!dragState.hasMoved && dragState.wasSelected) {
          setMoveFrom(''); setOptionSquares({}); resetDragState();
        } 
        else if (!dragState.hasMoved) resetDragState();
        else triggerSnapback(source);
      } else triggerSnapback(source);
    }
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragState.isDragging || dragState.isSnappingBack || dragState.isSuccessDrop || dragState.isRestoring) return;
      e.preventDefault(); 
      const dx = e.clientX - dragState.startX; const dy = e.clientY - dragState.startY;
      const hasMoved = Math.sqrt(dx * dx + dy * dy) > 3;
      setDragState(prev => ({ ...prev, x: e.clientX, y: e.clientY, hasMoved: prev.hasMoved || hasMoved }));
    };

    const handlePointerUp = (e) => stopDragging(e);
    const handlePointerCancel = (e) => stopDragging(e);

    if (dragState.isDragging) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragState, game, isBotMoving]);

  const displayFen = useMemo(() => {
    let tempFen = game.fen();
    try {
      const tempGame = new Chess(tempFen);
      if (preMove) {
        const p = tempGame.get(preMove.source);
        if (p) {
          tempGame.remove(preMove.source);
          tempGame.put(p, preMove.target);
        }
      }
      return tempGame.fen();
    } catch (err) {
      return tempFen;
    }
  }, [game.fen(), preMove]);

  const getPieceImageUrl = (piece) => {
    if (!piece) return '';
    const theme = settings?.pieceStyle || 'default';
    const pStr = piece.color + piece.type.toUpperCase();
    return theme === 'chesscom' ? `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${pStr.toLowerCase()}.png` : `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${theme === 'default' ? 'cburnett' : theme}/${pStr}.svg`;
  };

  const clickSelectStyle = moveFrom ? { [moveFrom]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const wrongMoveStyles = wrongMoveSquare ? { [wrongMoveSquare]: { backgroundColor: 'rgba(255, 0, 0, 0.4)' } } : {};
  const preMoveStyles = preMove ? { [preMove.source]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' }, [preMove.target]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' } } : {};
  const hintSquareStyle = hintLevel >= 1 && hintMove ? { [hintMove.from]: { backgroundColor: 'rgba(59, 130, 246, 0.6)' } } : {};

  const mergedSquareStyles = { ...customSquareStyles, ...rightClickedSquares, ...wrongMoveStyles, ...preMoveStyles, ...hintSquareStyle, ...optionSquares, ...clickSelectStyle };
  const customArrows = hintLevel === 2 && hintMove ? [[hintMove.from, hintMove.to, 'rgba(59, 130, 246, 0.8)']] : [];
  const squareWidth = boardRef.current ? boardRef.current.getBoundingClientRect().width / 8 : 50;

  return (
    <div 
      ref={boardRef} 
      style={{ position: 'relative', touchAction: 'none', cursor: dragState.isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      onPointerDown={handlePointerDown} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} 
    >
      {/* VÉDELEM a react-chessboard betöltési animációja ellen */}
      <style>{`
        div[data-board] div[data-piece] {
          opacity: 1 !important;
        }
      `}</style>
      
      {/* Amíg megfogva tartjuk (és még nem engedtük el véglegesen), a startmező láthatatlan! */}
      {dragState.isDragging && dragState.source && !dragState.isRestoring && (
        <style>{`
          div[data-square="${dragState.source}"] img,
          div[data-square="${dragState.source}"] [data-piece] {
            opacity: 0 !important;
          }
        `}</style>
      )}

      <div style={{ pointerEvents: 'none' }}>
        <Chessboard 
          position={displayFen} 
          arePiecesDraggable={false} 
          boardOrientation={boardOrientation}
          customSquareStyles={mergedSquareStyles}
          customArrows={customArrows}
          customDarkSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.dark }}
          customLightSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'blue']?.light }}
          customPieces={getCustomPieces(settings?.pieceStyle)}
          showBoardNotation={settings?.showCoordinates ?? true}
          animationDuration={boardAnimDuration} 
          {...props}
        />
      </div>

      {dragState.isDragging && (
        <img 
          src={getPieceImageUrl(dragState.piece)}
          alt="dragged piece"
          draggable="false"
          style={{
            position: 'fixed',
            left: dragState.x,
            top: dragState.y,
            width: squareWidth * ((dragState.isSnappingBack || dragState.isSuccessDrop || dragState.isRestoring) ? 1 : 1.25),
            height: squareWidth * ((dragState.isSnappingBack || dragState.isSuccessDrop || dragState.isRestoring) ? 1 : 1.25),
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            filter: (dragState.isSnappingBack || dragState.isSuccessDrop || dragState.isRestoring) ? 'none' : 'drop-shadow(0 15px 25px rgba(0,0,0,0.5))',
            transition: (dragState.isSnappingBack || dragState.isSuccessDrop)
              ? 'left 0.15s ease-out, top 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out, filter 0.15s ease-out' 
              : 'none',
            userSelect: 'none'
          }}
        />
      )}
    </div>
  );
}