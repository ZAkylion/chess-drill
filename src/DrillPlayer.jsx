import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DrillGame from './DrillGame';
import { translations } from './translations';

export default function DrillPlayer({ onBack, session, settings }) {
  const [drills, setDrills] = useState([]);
  const [selectedKategoria, setSelectedKategoria] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [isRandom, setIsRandom] = useState(true);
  const [playingDrills, setPlayingDrills] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);

  const lang = settings?.language || 'hu';
  const t = translations[lang];

  useEffect(() => {
    fetchDrills();
  }, [session]);

  async function fetchDrills() {
    if (!session) return;
    const { data } = await supabase.from('variaciok').select('*').eq('user_id', session.user.id);
    if (data) setDrills(data);
  }

  const kategoriak = [...new Set(drills.map(d => d.kategoria).filter(Boolean))];
  const currentCourseDrills = selectedKategoria ? drills.filter(d => d.kategoria === selectedKategoria) : [];
  const chapters = [...new Set(currentCourseDrills.map(d => d.chapter).filter(Boolean))];

  function startDrill() {
    let filtered = currentCourseDrills;
    if (selectedChapter) {
      filtered = filtered.filter(d => d.chapter === selectedChapter);
    }
    if (filtered.length === 0) return;
    
    let toPlay = [...filtered];
    if (isRandom) toPlay = toPlay.sort(() => Math.random() - 0.5);
    
    setPlayingDrills(toPlay);
    setCurrentIndex(0);
    setResults([]);
    setFinished(false);
  }

  function handleComplete(hibak) {
    const newResults = [...results, { drill: playingDrills[currentIndex], hibak }];
    setResults(newResults);
    if (currentIndex + 1 < playingDrills.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setFinished(true);
    }
  }

  if (playingDrills.length > 0 && !finished) {
    return (
      <DrillGame 
        key={currentIndex}
        drill={playingDrills[currentIndex]} 
        settings={settings}
        onComplete={handleComplete} 
        onBack={() => setPlayingDrills([])} 
        currentIndex={currentIndex}
        totalDrills={playingDrills.length}
      />
    );
  }

  if (finished) {
    const osszHiba = results.reduce((acc, curr) => acc + curr.hibak, 0);
    return (
      <div className="center-container" style={{ textAlign: 'center' }}>
        <div className="card">
          <h2 style={{ color: 'var(--primary-blue)' }}>{t.practiceEnd}</h2>
          <p style={{ fontSize: '18px' }}>{t.totalDrills} <strong>{playingDrills.length}</strong></p>
          <p style={{ fontSize: '18px' }}>{t.mistakesCount} <strong style={{ color: osszHiba > 0 ? '#DC2626' : '#059669' }}>{osszHiba}</strong></p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
            <button className="btn-outline" onClick={() => setPlayingDrills([])}>{t.backToMenu}</button>
            <button className="btn-primary" onClick={startDrill}>{t.retryBtn}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="center-container" style={{ maxWidth: '600px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>{t.backToMenu}</button>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t.startPractice}</h2>
        {drills.length === 0 ? (
          <p>{t.selectCoursePrompt}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
            <div>
              <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>{t.courseSelectLabel}</label>
              <select className="input-field" value={selectedKategoria} onChange={(e) => { setSelectedKategoria(e.target.value); setSelectedChapter(''); }}>
                <option value="">-- {t.chooseCourse} --</option>
                {kategoriak.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {selectedKategoria && chapters.length > 0 && (
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>{t.chapterSelectLabel}</label>
                <select className="input-field" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
                  <option value="">-- {t.allChapters} --</option>
                  {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" checked={isRandom} onChange={() => setIsRandom(true)} style={{ accentColor: 'var(--primary-blue)' }} />
                {t.shuffleMode}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" checked={!isRandom} onChange={() => setIsRandom(false)} style={{ accentColor: 'var(--primary-blue)' }} />
                {t.sequentialMode}
              </label>
            </div>

            <button className="btn-primary" onClick={startDrill} disabled={!selectedKategoria} style={{ marginTop: '15px', opacity: !selectedKategoria ? 0.5 : 1 }}>
              {t.startBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}