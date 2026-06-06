import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function DrillList({ drillLista, onEdit, onDelete, isAdmin }) {
  const [mappaAllapotok, setMappaAllapotok] = useState({});

  useEffect(() => {
    fetchMappak();
  }, [drillLista]);

  async function fetchMappak() {
    const { data } = await supabase.from('mappak').select('nev, allapot');
    if (data) {
      const map = {};
      data.forEach(m => map[m.nev] = m.allapot);
      setMappaAllapotok(map);
    }
  }

  // Funkció az állapot váltására (Privát <-> Publikus)
  async function toggleAllapot(nev, jelenlegiAllapot) {
    const ujAllapot = jelenlegiAllapot === 'publikus' ? 'privat' : 'publikus';
    
    // Frissítjük az adatbázisban
    const { error } = await supabase
      .from('mappak')
      .update({ allapot: ujAllapot })
      .eq('nev', nev);
      
    if (!error) {
      // Helyileg is frissítjük a state-et az azonnali visszajelzéshez
      setMappaAllapotok(prev => ({ ...prev, [nev]: ujAllapot }));
    } else {
      alert("Hiba történt a láthatóság módosításakor.");
    }
  }

  const csoportok = drillLista.reduce((acc, drill) => {
    if (!acc[drill.kategoria]) acc[drill.kategoria] = [];
    acc[drill.kategoria].push(drill);
    return acc;
  }, {});

  return (
    <div style={{ marginTop: '30px', textAlign: 'left' }}>
      <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>📁 Saját mappáim</h3>
      {Object.entries(csoportok).map(([kategoria, drillek]) => (
        <div key={kategoria} style={{ marginBottom: '15px', border: '1px solid #eee', padding: '12px', borderRadius: '8px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0 }}>📂 {kategoria}</h4>
            
            {/* Itt a váltógomb, ami kezeli a láthatóságot */}
            <button 
              onClick={() => toggleAllapot(kategoria, mappaAllapotok[kategoria])}
              style={{ 
                fontSize: '12px', 
                cursor: 'pointer', 
                background: mappaAllapotok[kategoria] === 'publikus' ? '#e8f5e9' : '#fff3e0', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                padding: '4px 8px' 
              }}
            >
              {mappaAllapotok[kategoria] === 'publikus' ? '🌍 Publikus' : '🔒 Privát'}
            </button>
          </div>
          
          {drillek.map(d => (
            <div key={d.nev} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px', borderTop: '1px solid #f9f9f9' }}>
              <span>{d.nev}</span>
              <div>
                <button onClick={() => onEdit(d)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                <button onClick={() => onDelete(d.nev)} style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '5px' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}