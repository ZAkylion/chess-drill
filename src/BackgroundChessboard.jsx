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
  const { showChessboard } = useWindowSize(); // Behozzuk a láthatósági szabályt

  useEffect(() => {
    // Ha úgyse látszik a tábla, ne is terheljük az adatbázist a lekérdezéssel
    if (!showChessboard) return;

    async function fetchDrills() {
      try {
        const { data, error } = await supabase.from('variaciok').select('*').limit(50); 
        if (error) return;

        if (data && data.length > 0) {
          const formattedOpenings = data.map((drill) => {
            let moveList = [];
            if (drill.lepesek && typeof drill.lepesek === 'string') {
                moveList = drill.lepesek.split(',').map(m => m.trim()).filter(m => m !== '');
            }
            const variationSide = (moveList.length % 2 === 1) ? 'white' : 'black';
            return { moves: moveList, color: variationSide };
          }).filter(op => op.moves.length > 0); 

          if (formattedOpenings.length > 0) {
            setOpenings(formattedOpenings);
            pickRandomOpening(formattedOpenings);
          }
        }
      } catch (error) {}
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

  // HA A KÉPERNYŐ TÚL KICSI, ELTÜNTETJÜK A SAKKTÁBLÁT!
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