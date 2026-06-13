import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { translations } from './translations';
import InteractiveBoard from './InteractiveBoard';

export default function DrillGame({ drill, settings, onComplete, onBack, currentIndex, totalDrills }) {
  const drillLépések = drill.lepesek.split(',');
  const playerColor = drill.nev.toLowerCase().includes('black') ? 'b' : 'w';

  const [game, setGame] = useState(new Chess());
  const [lépésIndex, setLépésIndex] = useState(0);
  const [hibák, setHibák] = useState(0);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [hintLevel, setHintLevel] = useState(0); 
  const [hintMove, setHintMove] = useState(null);
  const [wrongMoveSquare, setWrongMoveSquare] = useState(null);
  const [isBotMoving, setIsBotMoving] = useState(playerColor === 'b');

  const lang = settings?.language || 'hu';
  const t = translations[lang];

  // Reset minden új drill indításakor
  useEffect(() => {
    setGame(new Chess());
    setLépésIndex(0);
    setHistory([{ fen: new Chess().fen(), lastMove: null }]);
    setIsCompleted(false);
    setHibák(0);
    setHintLevel(0);
    setHintMove(null);
    setWrongMoveSquare(null);
    setIsBotMoving(playerColor === 'b');
  }, [drill, playerColor]);

  function handlePrev() {
    if (lépésIndex > 0 && !wrongMoveSquare && !isBotMoving) {
      const newIdx = lépésIndex - 1;
      setLépésIndex(newIdx);
      setGame(new Chess(history[newIdx].fen));
      setHintLevel(0);
    }
  }

  function handleNext() {
    if (lépésIndex < history.length - 1 && !wrongMoveSquare && !isBotMoving) {
      const newIdx = lépésIndex + 1;
      setLépésIndex(newIdx);
      setGame(new Chess(history[newIdx].fen));
      setHintLevel(0);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lépésIndex, history, isBotMoving, wrongMoveSquare]);

  // A SZÜLŐNEK CSAK EZT AZ EGY FÜGGVÉNYT KELL BIZTOSÍTANIA AZ INTERACTIVE BOARD SZÁMÁRA
  function handleMoveAttempt(source, target) {
    if (isCompleted || wrongMoveSquare) return false;

    const gameCopy = new Chess(game.fen());
    let move = null;
    try { move = gameCopy.move({ from: source, to: target, promotion: 'q' }); } catch(e) { return false; }

    if (!move) return false;

    // Ellenőrizzük, hogy a helyes lépést húzta-e a repertoár szerint
    if (move.san !== drillLépések[lépésIndex]) {
      setHibák(prev => prev + 1);
      
      // JAVÍTÁS: Átmenetileg felrakjuk a táblára a rossz lépést, hogy a játékos vizuálisan is lássa a hibát!
      setGame(gameCopy);
      setWrongMoveSquare(target); // Ezt az InteractiveBoard pirosra festi
      
      setTimeout(() => {
        // 600ms után visszatekerjük az időt az eredeti, helyes állásra
        setGame(new Chess(history[lépésIndex].fen));
        setWrongMoveSquare(null);
      }, 600);
      
      // Igazzal térünk vissza, hogy az InteractiveBoard simán odategye a bábut, és elkerüljük a "vibráló" rángatást!
      return true; 
    }

    // Sikeres, jó lépés
    const updatedHistory = history.slice(0, lépésIndex + 1);
    updatedHistory.push({ fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } });
    
    setGame(gameCopy);
    setHistory(updatedHistory);
    setLépésIndex(updatedHistory.length - 1);
    setHintLevel(0);
    setHintMove(null);

    if (updatedHistory.length - 1 >= drillLépések.length) {
      setIsCompleted(true);
      return true;
    }

    setIsBotMoving(true);
    return true;
  }

  // BOT LÉPÉS AUTOMATIZMUSA
  useEffect(() => {
    if (isBotMoving && !isCompleted) {
      const timer = setTimeout(() => {
        const gameCopy = new Chess(game.fen());
        let botMove;
        try { botMove = gameCopy.move(drillLépések[lépésIndex]); } catch(e) { setIsBotMoving(false); return; }
        
        const finalHistory = [...history, { fen: gameCopy.fen(), lastMove: { from: botMove.from, to: botMove.to } }];
        setGame(new Chess(gameCopy.fen()));
        setHistory(finalHistory);
        
        const newIndex = lépésIndex + 1;
        setLépésIndex(newIndex);
        setIsBotMoving(false); // Amint ez false lesz, az InteractiveBoard belsőleg elsütheti a pre-move-ot!
        
        if (newIndex >= drillLépések.length) {
          setIsCompleted(true);
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #F0F4F8 0%, #E2ECF6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '6vh', overflowY: 'auto', zIndex: 1000, fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '700px', marginBottom: '20px', padding: '0 20px' }}>
        <button className="btn-outline" onClick={onBack} style={{ background: 'var(--white)' }}>{t.backBtn}</button>
        <strong style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', background: 'var(--white)', padding: '10px 20px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          DRILL {currentIndex + 1} / {totalDrills}
        </strong>
      </div>

      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%', maxWidth: '1200px', padding: '0 20px' }}>
        
        <div style={{ width: 'min(90vw, 65vh)', maxWidth: '700px', textAlign: 'center' }}>
          <div style={{ boxShadow: 'var(--shadow-md)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--white)' }}>
            
            {/* AZ ÚJ INTELIGENS TÁBLA BEKÖTÉSE */}
            <InteractiveBoard 
              game={game}
              boardOrientation={drill.nev.toLowerCase().includes('black') ? 'black' : 'white'}
              settings={settings}
              isBotMoving={isBotMoving}
              onMoveAttempt={handleMoveAttempt}
              wrongMoveSquare={wrongMoveSquare}
              hintMove={hintMove}
              hintLevel={hintLevel}
              customSquareStyles={moveSquares}
            />

          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
            <button className="btn-outline" onClick={handlePrev} disabled={lépésIndex === 0 || isBotMoving || wrongMoveSquare} style={{ padding: '8px 20px', background: 'var(--white)', opacity: (lépésIndex === 0 || isBotMoving || wrongMoveSquare) ? 0.5 : 1 }}>◀️</button>
            <button className="btn-outline" onClick={handleNext} disabled={lépésIndex === history.length - 1 || isBotMoving || wrongMoveSquare} style={{ padding: '8px 20px', background: 'var(--white)', opacity: (lépésIndex === history.length - 1 || isBotMoving || wrongMoveSquare) ? 0.5 : 1 }}>▶️</button>
          </div>
          
          <div className="card" style={{ marginTop: '15px', padding: '10px 15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', opacity: isCompleted ? 0 : 1, transition: 'opacity 0.3s ease' }}>
            <p style={{ margin: 0, height: '20px', fontWeight: 'bold', color: hintLevel > 0 ? 'var(--primary-blue)' : 'transparent' }}>
              {hintLevel === 1 && t.hintMovePiece}
              {hintLevel === 2 && t.hintFollowArrow}
            </p>
            <button className="btn-outline" onClick={handleHintClick} disabled={hintLevel === 2} style={{ borderColor: hintLevel === 1 ? '#F59E0B' : 'var(--primary-blue)', color: hintLevel === 1 ? '#F59E0B' : 'var(--primary-blue)' }}>
              {hintLevel === 0 ? t.hintRevealPiece : hintLevel === 1 ? t.hintExactTarget : t.hintRevealed}
            </button>
          </div>
        </div>

        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '15px', opacity: isCompleted ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          {drill.megjegyzes && (
            <div className="card" style={{ background: '#FFFBEB', borderColor: '#FDE68A', padding: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#D97706' }}>{t.commentTitle}</h3>
              <p style={{ margin: 0, color: 'var(--text-dark)', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-wrap' }}>{drill.megjegyzes}</p>
            </div>
          )}
          <div className="card" style={{ padding: '20px' }}>
            <button className="btn-primary" onClick={() => onComplete(hibák)} style={{ width: '100%', padding: '15px', fontSize: '16px' }}>
              {currentIndex + 1 < totalDrills ? t.nextDrillBtn : t.resultsBtn}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
