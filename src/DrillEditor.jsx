import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from './supabaseClient';
import DrillList from './DrillList';
// Importáld a konfigurációt
import { boardThemes, getCustomPieces } from './chessConfig';

export default function DrillEditor({ onBack, session, isAdmin, settings }) { // settings prop hozzáadva
  const [game, setGame] = useState(new Chess());
  const [editKategoria, setEditKategoria] = useState('Általános');
  const [editLepesek, setEditLepesek] = useState([]);
  const [drillLista, setDrillLista] = useState([]);
  const [editingDrillNev, setEditingDrillNev] = useState(null);

  const [lépésIndex, setLépésIndex] = useState(0);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);

  // Optimalizált stílusok és bábuk
  const customPieces = useMemo(() => getCustomPieces(settings.pieceStyle), [settings.pieceStyle]);
  const darkSquareStyle = { backgroundColor: boardThemes[settings.boardTheme]?.dark };
  const lightSquareStyle = { backgroundColor: boardThemes[settings.boardTheme]?.light };

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
  }

  function resetEditor() {
    setGame(new Chess()); setEditLepesek([]); setEditingDrillNev(null);
    setEditKategoria('Általános');
    setHistory([{ fen: new Chess().fen(), lastMove: null }]); 
    setLépésIndex(0);
  }

  function handlePrev() { if (lépésIndex > 0) { setLépésIndex(lépésIndex - 1); setGame(new Chess(history[lépésIndex - 1].fen)); } }
  function handleNext() { if (lépésIndex < history.length - 1) { setLépésIndex(lépésIndex + 1); setGame(new Chess(history[lépésIndex + 1].fen)); } }

  function onDrop(source, target) {
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

  return (
    <div style={{ width: '500px', margin: '40px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', cursor: 'pointer' }}>⬅️ Vissza a főmenübe</button>
      
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2>{editingDrillNev ? `✏️ Szerkesztés` : '➕ Új variáció'}</h2>
        
        <input 
            style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }} 
            placeholder="Mappa neve" 
            value={editKategoria} 
            onChange={(e) => setEditKategoria(e.target.value)} 
        />
        
        <div style={{ width: '440px', margin: '0 auto' }}>
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop} 
            customArrows={editorArrows} 
            customArrowColor="rgba(76, 175, 80, 0.8)" 
            // Itt alkalmazzuk az új stílusokat:
            customDarkSquareStyle={darkSquareStyle}
            customLightSquareStyle={lightSquareStyle}
            customPieces={customPieces}
          />
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button onClick={handlePrev}>◀️</button>
          <button onClick={handleNext}>▶️</button>
          <button style={{ background: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }} onClick={async () => {
              await supabase.from('mappak').upsert({ nev: editKategoria, allapot: 'privat', user_id: session.user.id }, { onConflict: 'nev', ignoreDuplicates: true });
              
              const payload = { nev: editingDrillNev || `${editKategoria}-${Date.now()}`, kategoria: editKategoria, lepesek: editLepesek.join(','), user_id: session.user.id };
              if (editingDrillNev) await supabase.from('variaciok').update(payload).eq('nev', editingDrillNev);
              else await supabase.from('variaciok').insert([payload]);
              
              fetchList(); resetEditor();
          }}>Mentés</button>
        </div>
      </div>
      
      <DrillList drillLista={drillLista} onEdit={startEditing} onDelete={async (nev) => { if(window.confirm('Törlés?')) { await supabase.from('variaciok').delete().eq('nev', nev); fetchList(); } }} isAdmin={isAdmin} />
    </div>
  );
}