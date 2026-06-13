import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { supabase } from './supabaseClient'; 
import useWindowSize from './useWindowSize'; 

export default function BackgroundChessboard() {
  const [game, setGame] = useState(new Chess());
  const [openings, setOpenings] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentOpening, setCurrentOpening] = useState(null);
  const [orientation, setOrientation] = useState('white'); 
  const { showChessboard } = useWindowSize();

  useEffect(() => {
    if (!showChessboard) return;

    async function fetchDrills() {
      try {
        // 1. Lekérjük a bejelentkezett felhasználót
        const { data: { session } } = await supabase.auth.getSession();
        let finalData = [];

        // 2. Ha be van jelentkezve, lekérjük a saját repertoárját
        if (session) {
          const { data: repData } = await supabase.from('user_repertoires').select('kategoria').eq('user_id', session.user.id);
          
          if (repData && repData.length > 0) {
            const categories = repData.map(r => r.kategoria);
            // Kikeressük azokat a variációkat, amik benne vannak a felhasználó repertoár kategóriáiban
            const { data, error } = await supabase.from('variaciok').select('*').in('kategoria', categories);
            if (!error && data) {
              finalData = data;
            }
          }
        }

        // 3. Ha nincs bejelentkezve, vagy teljesen üres a repertoárja, akkor alapértelmezett publikusakat húzunk be
        if (finalData.length === 0) {
           const { data, error } = await supabase.from('variaciok').select('*').eq('allapot', 'publikus').limit(100);
           if (!error && data) {
             finalData = data;
           }
        }

        // 4. Formázzuk a kapott adatokat a tábla számára
        if (finalData && finalData.length > 0) {
          const formattedOpenings = finalData.map((drill) => {
            let moveList = [];
            if (drill.lepesek && typeof drill.lepesek === 'string') {
                moveList = drill.lepesek.split(',').map(m => m.trim()).filter(m => m !== '');
            }
            // Okosabb színfelismerés a drill neve alapján (mint a többi komponensnél)
            const isBlack = drill.nev && drill.nev.toLowerCase().includes('black');
            const variationSide = isBlack ? 'black' : 'white';
            
            return { moves: moveList, color: variationSide };
          }).filter(op => op.moves.length > 0); 

          if (formattedOpenings.length > 0) {
            setOpenings(formattedOpenings);
            pickRandomOpening(formattedOpenings);
          }
        }
      } catch (error) {
        console.error("Háttér sakktábla hiba:", error);
      }
    }
    
    fetchDrills();
  }, [showChessboard]);

  const pickRandomOpening = (ops) => {
    if (!ops || ops.length === 0) return;
    const randomIndex = Math.floor(Math.random() * ops.length);
    const selected = ops[randomIndex];
    setCurrentOpening(selected);
    setOrientation(selected.color === 'black' ? 'black' : 'white');
    setGame(new Chess());
    setCurrentMoveIndex(0);
  };

  useEffect(() => {
    if (!currentOpening || !currentOpening.moves || !showChessboard) return;

    const moveInterval = setInterval(() => {
      if (currentMoveIndex < currentOpening.moves.length) {
        const gameCopy = new Chess(game.fen());
        try {
          const moveAttempt = gameCopy.move(currentOpening.moves[currentMoveIndex]);
          if (moveAttempt) {
             setGame(gameCopy);
             setCurrentMoveIndex(prev => prev + 1);
          } else {
             pickRandomOpening(openings);
          }
        } catch (e) {
          pickRandomOpening(openings);
        }
      } else {
        pickRandomOpening(openings);
      }
    }, 5000); 

    return () => clearInterval(moveInterval);
  }, [game, currentMoveIndex, currentOpening, openings, showChessboard]);

  if (!showChessboard) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      right: '200px', 
      transform: 'translateY(-50%)',
      width: '800px',
      height: '800px',
      opacity: 0.15, 
      pointerEvents: 'none',
      zIndex: 1,
      WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
      maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)'
    }}>
      <Chessboard 
        id="BackgroundBoard"
        position={game.fen()} 
        boardOrientation={orientation} 
        animationDuration={1000} 
        arePiecesDraggable={false}
        customDarkSquareStyle={{ backgroundColor: '#2b5c96' }}
        customLightSquareStyle={{ backgroundColor: '#e2ecf5' }}
      />
    </div>
  );
}
