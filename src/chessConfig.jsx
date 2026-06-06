// src/chessConfig.jsx
export const boardThemes = {
  classic: { name: 'Klasszikus Fa', light: '#f0d9b5', dark: '#b58863' },
  blue: { name: 'Jeges Kék', light: '#e8edf1', dark: '#7b9abe' },
  green: { name: 'Lichess Zöld', light: '#ffffdd', dark: '#86a666' },
  purple: { name: 'Lila Köd', light: '#f3e5f5', dark: '#ab47bc' },
  monochrome: { name: 'Fekete-Fehér', light: '#ffffff', dark: '#888888' },
  chesscom: { name: 'Chess.com Zöld', light: '#eeeed2', dark: '#769656' }
};

export const pieceThemes = {
  default: 'Alapértelmezett',
  alpha: 'Alpha',
  merida: 'Merida',
  cburnett: 'CBurnett',
  chesscom: 'Chess.com (CBurnett)',
  fantasy: 'Fantasy',
  shapes: 'Geometriai (Shapes)'
};

// src/chessConfig.jsx

export const getCustomPieces = (theme) => {
  if (!theme || theme === 'default') return undefined;
  
  // A 'chesscom' választásnál most a közvetlen Chess.com linket használjuk
  const isChessCom = theme === 'chesscom';
  
  const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
  const customPieces = {};
  
  pieces.forEach((p) => {
    // Ez a Chess.com hivatalos bábu-készlet URL-je (vastagabb vonalvezetés)
    const url = isChessCom 
      ? `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${p.toLowerCase()}.png`
      : `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${theme}/${p}.svg`;
    
    customPieces[p] = ({ squareWidth }) => (
      <img 
        src={url}
        alt={p}
        style={{ width: squareWidth, height: squareWidth, pointerEvents: 'none' }}
        draggable={false}
      />
    );
  });
  
  return customPieces;
};