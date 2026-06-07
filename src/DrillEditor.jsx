import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from './supabaseClient';
import DrillList from './DrillList';
import { boardThemes, getCustomPieces } from './chessConfig';

export default function DrillEditor({ onBack, session, isAdmin, settings }) {
  const [game, setGame] = useState(new Chess());
  const [editKategoria, setEditKategoria] = useState('Általános');
  const [editLepesek, setEditLepesek] = useState([]);
  const [drillLista, setDrillLista] = useState([]);
  const [editingDrillNev, setEditingDrillNev] = useState(null);
  const [lépésIndex, setLépésIndex] = useState(0);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);

  const [optionSquares, setOptionSquares] = useState({});
  const [moveFrom, setMoveFrom] = useState(''); 

  const customPieces = useMemo(() => getCustomPieces(settings?.pieceStyle), [settings?.pieceStyle]);

  const editorArrows = useMemo(() => {
    if (lépésIndex < editLepesek.length) {
      const tempChess = new Chess(game.fen());
      try {
        const m = tempChess.move(editLepesek[lépésIndex]);
        return m ? [[m.from, m.to]] : [];
      } catch (e) { return []; }
    }
    return [];
  }, [lépésIndex, editLepesek, game.fen()]);

  useEffect(() => { fetchList(); }, [session, isAdmin]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lépésIndex, history]);

  async function fetchList() {
    const { data } = await supabase.from('variaciok').select('*');
    if (data) {
      const lathatoDrillek = isAdmin ? data : data.filter(drill => session && drill.user_id === session.user.id);
      setDrillLista(lathatoDrillek);
    }
  }

  function startEditing(drill) {
    setEditingDrillNev(drill.nev);
    setEditKategoria(drill.kategoria);
    const moves = drill.lepesek.split(',');
    setEditLepesek(moves);
    const tempGame = new Chess();
    const newHistory = [{ fen: tempGame.fen(), lastMove: null }];
    moves.forEach(m => {
      const res = tempGame.move(m);
      if(res) newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to } });
    });
    setGame(tempGame);
    setHistory(newHistory);
    setLépésIndex(newHistory.length - 1);
    setOptionSquares({});
    setMoveFrom('');
  }

  function resetEditor() {
    setGame(new Chess()); setEditLepesek([]); setEditingDrillNev(null);
    setEditKategoria('Általános');
    setHistory([{ fen: new Chess().fen(), lastMove: null }]); 
    setLépésIndex(0);
    setOptionSquares({});
    setMoveFrom('');
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
      setEditLepesek([...editLepesek.slice(0, lépésIndex), move.san]); 
      const updatedHistory = [...history.slice(0, lépésIndex + 1), { fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } }];
      setHistory(updatedHistory);
      setLépésIndex(updatedHistory.length - 1);
    }
    return !!move;
  }

  async function saveDrill() {
    const { data: letezoMappa } = await supabase.from('mappak').select('allapot').eq('nev', editKategoria).single();
    const mappaAllapot = letezoMappa ? letezoMappa.allapot : 'publikus';
    await supabase.from('mappak').upsert({ nev: editKategoria, allapot: mappaAllapot, user_id: session.user.id }, { onConflict: 'nev', ignoreDuplicates: true });
    
    const userName = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Felhasználó';
    const payload = { nev: editingDrillNev || `${editKategoria}-${Date.now()}`, kategoria: editKategoria, lepesek: editLepesek.join(','), user_id: session.user.id, allapot: mappaAllapot, szerzo_nev: userName };
    
    if (editingDrillNev) await supabase.from('variaciok').update(payload).eq('nev', editingDrillNev);
    else await supabase.from('variaciok').insert([payload]);
    
    fetchList(); 
    resetEditor();
  }

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' }, [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const clickSelectStyle = moveFrom ? { [moveFrom]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};

  const customSquareStyles = { ...moveSquares, ...optionSquares, ...clickSelectStyle };

  return (
    <div className="center-container">
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Vissza a főmenübe</button>
      </div>
      
      <div className="card">
        <h2>{editingDrillNev ? `✏️ Szerkesztés` : '➕ Új variáció'}</h2>
        
        <input 
          className="input-field" 
          placeholder="Mappa neve" 
          value={editKategoria} 
          onChange={(e) => setEditKategoria(e.target.value)} 
          style={{ marginBottom: '20px' }}
        />
        
        <div style={{ maxWidth: '440px', margin: '0 auto', boxShadow: 'var(--shadow-md)', borderRadius: '4px', overflow: 'hidden' }}>
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop} 
            onPieceDragBegin={onPieceDragBegin}
            onSquareClick={onSquareClick}
            customArrows={editorArrows} 
            customArrowColor="rgba(76, 175, 80, 0.8)" 
            customPieces={customPieces}
            customDarkSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'classic']?.dark }}
            customLightSquareStyle={{ backgroundColor: boardThemes[settings?.boardTheme || 'classic']?.light }}
            showBoardNotation={settings?.showCoordinates ?? true}
            customSquareStyles={customSquareStyles}
          />
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button className="btn-outline" onClick={handlePrev}>◀️</button>
          <button className="btn-outline" onClick={handleNext}>▶️</button>
          <button className="btn-primary" onClick={saveDrill}>Mentés</button>
        </div>
      </div>
      
      <DrillList 
        drillLista={drillLista} 
        onEdit={startEditing} 
        onDelete={async (nev) => { if(window.confirm('Biztosan törlöd ezt a variációt?')) { await supabase.from('variaciok').delete().eq('nev', nev); fetchList(); } }} 
        isAdmin={isAdmin} 
      />
    </div>
  );
}