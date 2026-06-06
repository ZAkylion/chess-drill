import React from 'react';

export default function DrillList({ drillLista, onEdit, onDelete, isAdmin }) {
  // Csoportosítjuk a drilleket kategóriák (mappák) szerint
  const csoportok = drillLista.reduce((acc, drill) => {
    if (!acc[drill.kategoria]) acc[drill.kategoria] = [];
    acc[drill.kategoria].push(drill);
    return acc;
  }, {});

  return (
    <div style={{ marginTop: '30px', textAlign: 'left' }}>
      <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>📁 Saját mappáim</h3>
      {Object.entries(csoportok).map(([kategoria, drillek]) => (
        <div key={kategoria} className="card" style={{ marginBottom: '15px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>📂 {kategoria}</h4>
            {/* A Publikus/Privát gomb innen el lett távolítva, mivel mostantól minden közösségi */}
          </div>
          
          {drillek.map(d => (
            <div key={d.nev} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px', borderTop: '1px solid #f0f0f0' }}>
              <span>{d.nev}</span>
              <div>
                <button onClick={() => onEdit(d)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }} title="Szerkesztés">
                  ✏️
                </button>
                <button onClick={() => onDelete(d.nev)} style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '10px', fontSize: '16px' }} title="Törlés">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}