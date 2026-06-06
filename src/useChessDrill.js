import { useState } from 'react';
import { Chess } from 'chess.js';

export function useChessDrill(initialMoves = []) {
  const [game, setGame] = useState(new Chess());
  const [lépésIndex, setLépésIndex] = useState(0);
  const [history, setHistory] = useState([{ fen: new Chess().fen(), lastMove: null }]);
  const [hibák, setHibák] = useState(0);

  function reset(moves = []) {
    const tempGame = new Chess();
    const newHistory = [{ fen: tempGame.fen(), lastMove: null }];
    moves.forEach(m => {
      const res = tempGame.move(m);
      if (res) newHistory.push({ fen: tempGame.fen(), lastMove: { from: res.from, to: res.to } });
    });
    setGame(tempGame);
    setHistory(newHistory);
    setLépésIndex(newHistory.length - 1);
    setHibák(0);
  }

  function makeMove(source, target) {
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: source, to: target, promotion: 'q' });
      if (!move) return null;

      setGame(gameCopy);
      const newHistory = [...history.slice(0, lépésIndex + 1), { fen: gameCopy.fen(), lastMove: { from: move.from, to: move.to } }];
      setHistory(newHistory);
      setLépésIndex(newHistory.length - 1);
      return move;
    } catch (e) {
      return null;
    }
  }

  function undo() {
    if (lépésIndex > 0) {
      const newIdx = lépésIndex - 1;
      setLépésIndex(newIdx);
      setGame(new Chess(history[newIdx].fen));
    }
  }

  return { game, lépésIndex, history, hibák, setHibák, reset, makeMove, undo };
}