import React from 'react';
import { Chessboard } from 'react-chessboard';
// Az adatokat és logikát a külön fájlból importáljuk
import { boardThemes, pieceThemes, getCustomPieces } from './chessConfig';

export default function Settings({ onBack, settings, setSettings }) {
  
  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Bábuk előnézete a kiválasztott stílus alapján
  const previewPieces = getCustomPieces(settings.pieceStyle);

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack} style={{ cursor: 'pointer' }}>⬅️ Vissza a főmenübe</button>
      </div>
      
      <div className="card" style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: 'var(--primary-blue)', marginTop: 0, borderBottom: '2px solid var(--light-blue)', paddingBottom: '10px' }}>
          ⚙️ Beállítások
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px' }}>
          
          {/* Bot válaszideje */}
          <div>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              🤖 Bot válaszideje: <span style={{ color: 'var(--primary-blue)' }}>{settings.botDelay} ms</span>
            </label>
            <input 
              type="range" 
              min="0" max="2000" step="100"
              value={settings.botDelay} 
              onChange={(e) => handleChange('botDelay', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '5px' }}>
              <span>Azonnali</span>
              <span>Lassú</span>
            </div>
          </div>

          {/* Tábla stílusa */}
          <div>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              🎨 Tábla stílusa
            </label>
            <select 
              className="input-field" 
              value={settings.boardTheme}
              onChange={(e) => handleChange('boardTheme', e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              {Object.entries(boardThemes).map(([key, theme]) => (
                <option key={key} value={key}>{theme.name}</option>
              ))}
            </select>
          </div>

          {/* Bábuk stílusa */}
          <div>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              ♟️ Bábuk stílusa
            </label>
            <select 
              className="input-field" 
              value={settings.pieceStyle}
              onChange={(e) => handleChange('pieceStyle', e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              {Object.entries(pieceThemes).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Előnézet szekció */}
        <div style={{ marginTop: '30px', padding: '20px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#555' }}>👀 Előnézet</h4>
          <div style={{ width: '250px', margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <Chessboard 
              id="settings-preview-board"
              position="start" 
              customDarkSquareStyle={{ backgroundColor: boardThemes[settings.boardTheme]?.dark }}
              customLightSquareStyle={{ backgroundColor: boardThemes[settings.boardTheme]?.light }}
              customPieces={previewPieces}
              animationDuration={200}
            />
          </div>
        </div>

      </div>
    </div>
  );
}