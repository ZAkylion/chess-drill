import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DrillGame from './DrillGame'; 
import { boardThemes, getCustomPieces } from './chessConfig'; // Importáltuk a konfigurációt

export default function DrillPlayer({ onBack, session, settings }) {
  const [drillLista, setDrillLista] = useState([]);
  const [myRepertoire, setMyRepertoire] = useState([]);
  
  const [playMode, setPlayMode] = useState('setup'); 
  const [selectedKategoriak, setSelectedKategoriak] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [drillResults, setDrillResults] = useState([]); 

  useEffect(() => { 
    fetchList(); 
    if (session) fetchRepertoire(); 
  }, [session]);

  async function fetchList() {
    const { data } = await supabase.from('variaciok').select('*');
    if (data) {
      const lathatoDrillek = data.filter(drill => drill.publikus !== false || (session && drill.user_id === session.user.id));
      setDrillLista(lathatoDrillek);
    }
  }

  async function fetchRepertoire() {
    const { data } = await supabase.from('user_repertoires').select('kategoria').eq('user_id', session.user.id);
    if (data) setMyRepertoire(data.map(item => item.kategoria));
  }

  const groupedDrills = drillLista.reduce((acc, drill) => {
    if (myRepertoire.includes(drill.kategoria)) {
      (acc[drill.kategoria] = acc[drill.kategoria] || []).push(drill);
    }
    return acc;
  }, {});

  function toggleKategoria(kat) {
    if (selectedKategoriak.includes(kat)) setSelectedKategoriak(selectedKategoriak.filter(k => k !== kat));
    else setSelectedKategoriak([...selectedKategoriak, kat]);
  }

  function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  function startDrillShuffle() {
    if (selectedKategoriak.length === 0) return alert('Válassz ki legalább egy mappát!');
    const activeDrills = drillLista.filter(d => selectedKategoriak.includes(d.kategoria));
    if (activeDrills.length === 0) return alert('Nincs drill a kiválasztott mappákban!');

    setPlaylist(shuffleArray(activeDrills));
    setCurrentDrillIndex(0);
    setDrillResults([]); 
    setPlayMode('playing');
  }

  function handleDrillComplete(hibákCount) {
    const isPerfect = hibákCount === 0;
    setDrillResults(prev => [...prev, { nev: playlist[currentDrillIndex].nev, perfect: isPerfect }]);

    if (currentDrillIndex + 1 < playlist.length) {
      setCurrentDrillIndex(prev => prev + 1);
    } else {
      setPlayMode('summary');
    }
  }

  // Setup mód: mappaválasztás
  if (playMode === 'setup') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <button className="btn-outline" onClick={onBack}>⬅️ Vissza a főmenübe</button>
        </div>

        <h2 style={{ textAlign: 'center', color: 'var(--primary-blue)', marginBottom: '20px' }}>Drill Setup: Mappák kiválasztása</h2>
        
        {!session ? (
          <div className="card" style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#DC2626', textAlign: 'center' }}>
            <strong>Jelentkezz be a gyakorláshoz!</strong>
          </div>
        ) : Object.keys(groupedDrills).length === 0 ? (
          <div className="card" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706', textAlign: 'center' }}>
            <strong>A repertoárod üres!</strong>
          </div>
        ) : (
          <div className="card">
            {Object.keys(groupedDrills).map(kat => {
              const isSelected = selectedKategoriak.includes(kat);
              return (
                <div key={kat} onClick={() => toggleKategoria(kat)} style={{ padding: '15px', margin: '10px 0', border: isSelected ? '2px solid var(--primary-blue)' : '1px solid #E5E7EB', borderRadius: '8px', background: isSelected ? 'var(--light-blue)' : 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>📂 {kat}</span>
                  <span style={{ color: 'var(--text-light)' }}>{groupedDrills[kat].length} variáció</span>
                </div>
              );
            })}
            
            <button className="btn-primary" onClick={startDrillShuffle} disabled={selectedKategoriak.length === 0} style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '20px', background: selectedKategoriak.length > 0 ? 'var(--primary-blue)' : '#D1D5DB' }}>
              ▶ START DRILL SHUFFLE
            </button>
          </div>
        )}
      </div>
    );
  }

  // Összegzés mód
  if (playMode === 'summary') {
    const perfectCount = drillResults.filter(r => r.perfect).length;
    const totalCount = drillResults.length;
    const percent = totalCount === 0 ? 0 : Math.round((perfectCount / totalCount) * 100);

    return (
      <div style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: 'var(--primary-blue)' }}>Gyakorlás Befejezve!</h1>
        <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: `conic-gradient(var(--primary-blue) ${percent}%, #EF4444 0)`, margin: '30px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>{perfectCount} / {totalCount}</span>
        </div>
        <button className="btn-primary" onClick={() => setPlayMode('setup')} style={{ width: '100%', padding: '15px' }}>🔄 Új gyakorlás indítása</button>
      </div>
    );
  }

  // Játék nézet: Itt adjuk át a konfigurációból nyert értékeket a DrillGame-nek
  return (
    <DrillGame 
      key={playlist[currentDrillIndex].nev} 
      drill={playlist[currentDrillIndex]} 
      settings={settings} // Ezt az objektumot továbbítjuk
      currentIndex={currentDrillIndex}
      totalDrills={playlist.length}
      onComplete={handleDrillComplete}
      onBack={() => setPlayMode('setup')}
    />
  );
}