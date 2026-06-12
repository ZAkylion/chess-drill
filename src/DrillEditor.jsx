import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from './supabaseClient';
import { boardThemes, getCustomPieces } from './chessConfig';
import { translations } from './translations';

export default function DrillEditor({ onBack, session, isAdmin, settings, importPayload, clearImportPayload }) {
  const [activeTab, setActiveTab] = useState('editor');
  const [managerCourse, setManagerCourse] = useState(null);
  
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState('white');
  
  const [editKategoria, setEditKategoria] = useState('');
  const [editChapter, setEditChapter] = useState('');
  const [editMegjegyzes, setEditMegjegyzes] = useState(''); 
  const [importText, setImportText] = useState(''); 
  
  const [editLepesek, setEditLepesek] = useState([]);
  const [drillLista, setDrillLista] = useState([]);
  const [editingDrillNev, setEditingDrillNev] = useState(null);
  const [lépésIndex, setLépésIndex] = useState(0);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);

  const [optionSquares, setOptionSquares] = useState({});
  const [moveFrom, setMoveFrom] = useState(''); 

  const lang = settings?.language || 'hu';
  const t = translations[lang] || translations['hu'] || {};

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

  // ÚJ, GOLYÓÁLLÓ AUTOMATIKUS FELDOLGOZÓ (Átugorja a szemetet)
  useEffect(() => {
    if (importPayload && importPayload.moves) {
      
      if (importPayload.course) setEditKategoria(importPayload.course);
      if (importPayload.chapter) setEditChapter(importPayload.chapter);
      
      const isBlack = (importPayload.course + importPayload.chapter).toLowerCase().includes('black');
      setBoardOrientation(isBlack ? 'black' : 'white');

      let rawMoves = importPayload.moves;
      let cleaned = rawMoves.replace(/\{[^}]*\}/g, '').replace(/\([^)]*\)/g, '');
      cleaned = cleaned.replace(/\b\d+\s*\.{1,3}/g, ' '); 
      cleaned = cleaned.replace(/[!?]/g, ''); // Kigyomláljuk az értékelő jeleket (pl. !?)

      let movesArray = cleaned.includes(',') ? cleaned.split(',') : cleaned.split(/\s+/);
      movesArray = movesArray.map(m => m.trim()).filter(move => move.length > 0);

      const tempGame = new Chess();
      const newHistory = [{ fen: tempGame.fen(), lastMove: null }];
      const validMoves = [];

      for (let m of movesArray) {
        try {
          const res = tempGame.move(m);
          if (res) {
            validMoves.push(res.san);
            newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to } });
          } else {
            // Ha rossz a lépés, de még egy jó sem volt, csak simán átugorjuk a fejlécet/szemetet!
            if (validMoves.length > 0) break;
          }
        } catch (e) { 
          if (validMoves.length > 0) break;
        }
      }

      if (validMoves.length > 0) {
        setEditLepesek(validMoves);
        setGame(tempGame);
        setHistory(newHistory);
        setLépésIndex(newHistory.length - 1);
        setOptionSquares({});
        setMoveFrom('');
        alert(lang === 'en' ? `🤖 Auto-imported ${validMoves.length} moves!` : `🤖 A robot sikeresen kitöltött mindent és betöltött ${validMoves.length} lépést a táblára! Mentsd el!`);
      } else {
        alert(lang === 'en' ? `Error. Raw text: ${rawMoves}` : `Hiba: Még mindig nem találok érvényes lépést. Ezt kaptam a robottól:\n\n${rawMoves}`);
      }

      clearImportPayload();
    }
  }, [importPayload, lang]);

  useEffect(() => {
    if (activeTab !== 'editor') return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lépésIndex, history, activeTab]);

  async function fetchList() {
    const { data } = await supabase.from('variaciok').select('*');
    if (data) {
      const lathatoDrillek = isAdmin ? data : data.filter(drill => session && drill.user_id === session.user.id);
      setDrillLista(lathatoDrillek);
    }
  }

  function startEditing(drill) {
    setEditingDrillNev(drill.nev);
    setEditKategoria(drill.kategoria || '');
    setEditChapter(drill.chapter || ''); 
    setEditMegjegyzes(drill.megjegyzes || ''); 
    setImportText('');
    
    const isBlack = drill.nev.toLowerCase().includes('black');
    setBoardOrientation(isBlack ? 'black' : 'white');

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
    setActiveTab('editor'); 
  }

  function resetEditor() {
    setGame(new Chess()); 
    setEditLepesek([]); 
    setEditingDrillNev(null);
    setEditMegjegyzes(''); 
    setImportText('');
    setHistory([{ fen: new Chess().fen(), lastMove: null }]); 
    setLépésIndex(0);
    setOptionSquares({});
    setMoveFrom('');
  }

  function handleAddVariationToChapter(courseName, chapterName) {
    resetEditor();
    setEditKategoria(courseName);
    setEditChapter(chapterName);
    setActiveTab('editor');
  }

  // A manuális importáló is megkapta a golyóálló algoritmust
  function handleSmartImport() {
    if (!importText.trim()) return;
    let cleaned = importText.replace(/\{[^}]*\}/g, '').replace(/\([^)]*\)/g, '');
    cleaned = cleaned.replace(/\b\d+\s*\.{1,3}/g, ' ').replace(/[!?]/g, '');

    let movesArray = cleaned.includes(',') ? cleaned.split(',') : cleaned.split(/\s+/);
    movesArray = movesArray.map(m => m.trim()).filter(move => move.length > 0);

    const tempGame = new Chess();
    const newHistory = [{ fen: tempGame.fen(), lastMove: null }];
    const validMoves = [];

    for (let m of movesArray) {
      try {
        const res = tempGame.move(m);
        if (res) {
          validMoves.push(res.san);
          newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to } });
        } else {
          if (validMoves.length > 0) break;
        }
      } catch (e) { 
        if (validMoves.length > 0) break;
      }
    }

    if (validMoves.length > 0) {
      setEditLepesek(validMoves);
      setGame(tempGame);
      setHistory(newHistory);
      setLépésIndex(newHistory.length - 1);
      setOptionSquares({});
      setMoveFrom('');
      setImportText(''); 
      alert(lang === 'en' ? `Successfully imported ${validMoves.length} moves!` : `Sikeresen beolvasva ${validMoves.length} lépés!`);
    } else {
      alert(lang === 'en' ? 'Could not find any valid chess moves.' : 'Nem találtam érvényes sakk lépést!');
    }
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
    if (!editKategoria.trim() || !editChapter.trim()) return alert(t.errorMissingFields);

    let finalName = editingDrillNev;
    if (!finalName) {
      const timestamp = Date.now();
      const colorSuffix = boardOrientation === 'black' ? '(Black)' : '(White)';
      finalName = `${editKategoria.trim()} - ${timestamp} ${colorSuffix}`;
    }

    const { data: letezoMappa } = await supabase.from('mappak').select('allapot').eq('nev', editKategoria.trim()).single();
    const mappaAllapot = letezoMappa ? letezoMappa.allapot : 'publikus';
    await supabase.from('mappak').upsert({ nev: editKategoria.trim(), allapot: mappaAllapot, user_id: session.user.id }, { onConflict: 'nev', ignoreDuplicates: true });
    
    const userName = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Felhasználó';
    const payload = { 
      nev: finalName, 
      kategoria: editKategoria.trim(), 
      chapter: editChapter.trim(), 
      megjegyzes: editMegjegyzes.trim(),
      lepesek: editLepesek.join(','), 
      user_id: session.user.id, 
      allapot: mappaAllapot, 
      szerzo_nev: userName 
    };
    
    if (editingDrillNev) await supabase.from('variaciok').update(payload).eq('nev', editingDrillNev);
    else await supabase.from('variaciok').insert([payload]);
    
    fetchList(); 
    resetEditor();
    alert(t.saveSuccess);
  }

  async function handleDelete(nev) {
    if(window.confirm(`${t.confirmDelete}${nev}?`)) { 
      await supabase.from('variaciok').delete().eq('nev', nev); 
      fetchList(); 
    }
  }

  async function handleRename(oldName) {
    const newName = window.prompt(t.promptRename, oldName);
    if (newName && newName.trim() !== '' && newName !== oldName) {
      await supabase.from('variaciok').update({ nev: newName.trim() }).eq('nev', oldName);
      fetchList();
      if (editingDrillNev === oldName) setEditingDrillNev(newName.trim()); 
    }
  }

  function flipBoard() {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }

  const myDrills = isAdmin ? drillLista : drillLista.filter(d => d.user_id === session?.user?.id);
  const myCourses = [...new Set(myDrills.map(d => d.kategoria).filter(Boolean))];
  const currentCourseDrills = editKategoria.trim() ? myDrills.filter(d => d.kategoria === editKategoria.trim()) : myDrills;
  const myChapters = [...new Set(currentCourseDrills.map(d => d.chapter).filter(Boolean))];

  const lastMove = history[lépésIndex]?.lastMove;
  const moveSquares = lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' }, [lastMove.to]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const clickSelectStyle = moveFrom ? { [moveFrom]: { backgroundColor: 'rgba(255, 255, 51, 0.5)' } } : {};
  const customSquareStyles = { ...moveSquares, ...optionSquares, ...clickSelectStyle };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '40px 20px', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ width: '100%', maxWidth: '900px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
          <button className="btn-outline" onClick={onBack}>{t.backToMenu}</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={activeTab === 'editor' ? "btn-primary" : "btn-outline"} onClick={() => setActiveTab('editor')}>
              {t.editorTab}
            </button>
            <button className={activeTab === 'manager' ? "btn-primary" : "btn-outline"} onClick={() => { setActiveTab('manager'); setManagerCourse(null); }}>
              {t.managerTab}
            </button>
          </div>
        </div>
        
        {activeTab === 'editor' && (
          <div className="card" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary-blue)' }}>{editingDrillNev ? `✏️ ${editingDrillNev}` : t.newVariation}</h2>
              {editingDrillNev && <button className="btn-outline" onClick={resetEditor} style={{ padding: '5px 10px', fontSize: '12px' }}>{t.cancel}</button>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: editKategoria.trim() !== '' ? '1fr 1fr' : '1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', display: 'block', marginBottom: '5px' }}>{t.courseNameLabel}</label>
                <input className="input-field" placeholder={t.coursePlaceholder} value={editKategoria} onChange={(e) => setEditKategoria(e.target.value)} list="course-suggestions" />
                <datalist id="course-suggestions">{myCourses.map(course => <option key={course} value={course} />)}</datalist>
              </div>
              
              {editKategoria.trim() !== '' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', display: 'block', marginBottom: '5px' }}>{t.chapterLabel}</label>
                  <input className="input-field" placeholder={t.chapterPlaceholder} value={editChapter} onChange={(e) => setEditChapter(e.target.value)} list="chapter-suggestions" />
                  <datalist id="chapter-suggestions">{myChapters.map(chapter => <option key={chapter} value={chapter} />)}</datalist>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px', background: 'var(--light-blue)', padding: '15px', borderRadius: '8px', border: '1px dashed var(--primary-blue)' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary-blue)', display: 'block', marginBottom: '8px' }}>
                ⚡ {lang === 'en' ? 'Smart Import' : 'Okos Importálás'}
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                <textarea 
                  className="input-field" 
                  placeholder={lang === 'en' ? "e.g.: 1. e4 e5 2. Nf3 Nc6..." : "Pl.: 1. e4 e5 2. Nf3 Nc6..."}
                  value={importText} 
                  onChange={(e) => setImportText(e.target.value)}
                  style={{ flex: 1, resize: 'vertical', minHeight: '42px', margin: 0 }}
                />
                <button 
                  className="btn-primary" 
                  onClick={handleSmartImport}
                  style={{ padding: '0 20px', whiteSpace: 'nowrap', borderRadius: '6px' }}
                >
                  {lang === 'en' ? 'Load' : 'Beolvasás'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', display: 'block', marginBottom: '5px' }}>{t.commentLabel}</label>
              <textarea 
                className="input-field" 
                placeholder={t.commentPlaceholder} 
                value={editMegjegyzes} 
                onChange={(e) => setEditMegjegyzes(e.target.value)}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <button 
                className="btn-outline" 
                onClick={flipBoard}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '14px' }}
              >
                {t.flipBoardBtn || '🔄 Tábla megfordítása'} ({boardOrientation === 'white' ? (t.colorWhite || 'Világos') : (t.colorBlack || 'Sötét')})
              </button>
            </div>

            <div style={{ maxWidth: '440px', margin: '0 auto', boxShadow: 'var(--shadow-md)', borderRadius: '4px', overflow: 'hidden' }}>
              <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop} 
                onPieceDragBegin={onPieceDragBegin}
                onSquareClick={onSquareClick}
                boardOrientation={boardOrientation} 
                customArrows={[...editorArrows]}
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
              <button className="btn-primary" onClick={saveDrill}>{t.saveBtn}</button>
            </div>
          </div>
        )}

        {activeTab === 'manager' && (
          <div className="card" style={{ width: '100%', minHeight: '400px' }}>
            {!managerCourse ? (
              <>
                <h2 style={{ color: 'var(--primary-blue)', marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>{t.myCoursesTitle}</h2>
                {myCourses.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: '40px' }}>{t.noVariationsYet}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                    {myCourses.map(courseName => {
                      const count = myDrills.filter(d => d.kategoria === courseName).length;
                      return (
                        <div key={courseName} onClick={() => setManagerCourse(courseName)} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => Object.assign(e.currentTarget.style, { borderColor: 'var(--primary-blue)', background: 'var(--light-blue)' })} onMouseOut={(e) => Object.assign(e.currentTarget.style, { borderColor: '#ddd', background: 'transparent' })}>
                          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📂 {courseName}</h3>
                          <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>{count} {t.variationCount}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                  <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setManagerCourse(null)}>{t.backBtn}</button>
                  <h2 style={{ margin: 0, color: 'var(--text-dark)' }}>{managerCourse}</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    const courseDrills = myDrills.filter(d => d.kategoria === managerCourse);
                    const chapters = courseDrills.reduce((acc, drill) => {
                      const ch = drill.chapter || 'Általános';
                      if (!acc[ch]) acc[ch] = [];
                      acc[ch].push(drill);
                      return acc;
                    }, {});

                    return Object.entries(chapters).sort().map(([chapterName, drills]) => (
                      <div key={chapterName} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h3 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '16px' }}>📑 {chapterName}</h3>
                          <button onClick={() => handleAddVariationToChapter(managerCourse, chapterName)} style={{ border: 'none', background: '#D1FAE5', color: '#047857', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                            {t.newVariation}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {drills.map(d => (
                            <div key={d.nev} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 15px', borderRadius: '6px', border: '1px solid #eee' }}>
                              <span style={{ fontWeight: '500', fontSize: '14px' }}>
                                {d.nev.toLowerCase().includes('black') ? '⚫ ' : '⚪ '}
                                {d.nev}
                              </span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => startEditing(d)} style={{ border: 'none', background: '#DBEAFE', color: '#1D4ED8', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t.editBtnShort}</button>
                                <button onClick={() => handleRename(d.nev)} style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t.renameBtn}</button>
                                <button onClick={() => handleDelete(d.nev)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t.deleteBtn}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}