import React from 'react';
import { Chessboard } from 'react-chessboard';
import { boardThemes, pieceThemes, getCustomPieces } from './chessConfig';
import { translations } from './translations'; // ÚJ IMPORT

export default function Settings({ onBack, settings, setSettings }) {
  
  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Aktuális nyelv meghatározása (alapértelmezett: magyar)
  const lang = settings.language || 'hu';
  const t = translations[lang];

  // Bábuk előnézete a kiválasztott stílus alapján
  const previewPieces = getCustomPieces(settings.pieceStyle);

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack} style={{ cursor: 'pointer' }}>
          {t.backToMenu}
        </button>
      </div>
      
      <div className="card" style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: 'var(--primary-blue)', marginTop: 0, borderBottom: '2px solid var(--light-blue)', paddingBottom: '10px' }}>
          {t.settingsTitle}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px' }}>
          
          {/* ÚJ: Nyelvválasztó */}
          <div>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              {t.language}
            </label>
            <select 
              className="input-field" 
              value={lang}
              onChange={(e) => handleChange('language', e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="hu">Magyar</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Bot válaszideje */}
          <div>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              {t.botDelay}: <span style={{ color: 'var(--primary-blue)' }}>{settings.botDelay} ms</span>
            </label>
            <input 
              type="range" 
              min="0" max="2000" step="100"
              value={settings.botDelay} 
              onChange={(e) => handleChange('botDelay', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '5px' }}>
              <span>{t.instant}</span>
              <span>{t.slow}</span>
            </div>
          </div>

          {/* Tábla stílusa */}
          <div>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              {t.boardStyle}
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
              {t.pieceStyle}
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

          {/* Tábla koordináták kapcsoló */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{t.showCoordinates}</span>
            </label>
            <input 
              type="checkbox" 
              checked={settings.showCoordinates ?? true}
              onChange={(e) => handleChange('showCoordinates', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-blue)' }}
            />
          </div>

          {/* Legális lépések mutatása kapcsoló */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{t.showLegalMoves}</span>
            </label>
            <input 
              type="checkbox" 
              checked={settings.showLegalMoves ?? true}
              onChange={(e) => handleChange('showLegalMoves', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-blue)' }}
            />
          </div>

        </div>

        {/* Előnézet szekció */}
        <div style={{ marginTop: '30px', padding: '20px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#555' }}>{t.preview}</h4>
          <div style={{ width: '250px', margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <Chessboard 
              id="settings-preview-board"
              position="start" 
              customDarkSquareStyle={{ backgroundColor: boardThemes[settings.boardTheme]?.dark }}
              customLightSquareStyle={{ backgroundColor: boardThemes[settings.boardTheme]?.light }}
              customPieces={previewPieces}
              showBoardNotation={settings.showCoordinates ?? true}
              animationDuration={200}
            />
          </div>
        </div>

      </div>
    </div>
  );
}