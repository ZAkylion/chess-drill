import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import DrillGame from './DrillGame';
import { translations } from './translations';

export default function DrillPlayer({ onBack, session, settings }) {
  const [drills, setDrills] = useState([]);
  
  // Objektum, ami tárolja a kipipált kurzusokat és fejezeteket
  const [selections, setSelections] = useState({});
  
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

  // Kurzusok és fejezetek hierarchikus csoportosítása
  const courseStructure = useMemo(() => {
    const map = {};
    drills.forEach(d => {
      if (!d.kategoria) return;
      if (!map[d.kategoria]) map[d.kategoria] = new Set();
      if (d.chapter) map[d.kategoria].add(d.chapter);
    });
    return map;
  }, [drills]);

  // Kurzus pipálásának kezelése
  function toggleCourse(course) {
    setSelections(prev => {
      const next = { ...prev };
      if (next[course]) {
        delete next[course];
      } else {
        next[course] = Array.from(courseStructure[course]);
      }
      return next;
    });
  }

  // Fejezet pipálásának kezelése
  function toggleChapter(course, chapter) {
    setSelections(prev => {
      const next = { ...prev };
      if (!next[course]) next[course] = [];
      
      if (next[course].includes(chapter)) {
        next[course] = next[course].filter(c => c !== chapter);
        if (next[course].length === 0 && courseStructure[course].size > 0) {
          delete next[course];
        }
      } else {
        next[course] = [...next[course], chapter];
      }
      return next;
    });
  }

  // Start Drill: Mindig véletlenszerű (Shuffle) sorrendben
  function startDrill() {
    const toPlay = drills.filter(d => {
      if (!d.kategoria || !selections[d.kategoria]) return false;
      if (d.chapter && !selections[d.kategoria].includes(d.chapter)) return false;
      return true;
    });

    if (toPlay.length === 0) return;
    
    // Automatikus keverés
    const finalDrills = [...toPlay].sort(() => Math.random() - 0.5);
    
    setPlayingDrills(finalDrills);
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

  const isAnyCourseSelected = Object.keys(selections).length > 0;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
        <div className="card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <button className="btn-outline" onClick={onBack}>{t.backToMenu}</button>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, color: 'var(--primary-blue)', textAlign: 'center' }}>{t.startPractice}</h2>
          
          {drills.length === 0 ? (
            <p style={{ textAlign: 'center' }}>{t.selectCoursePrompt}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* CHECKBOX LISTA */}
              <div style={{ 
                background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', 
                padding: '15px', maxHeight: '40vh', overflowY: 'auto' 
              }}>
                <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                  {t.courseSelectLabel}
                </label>
                
                {Object.keys(courseStructure).map(course => {
                  const chapters = Array.from(courseStructure[course]);
                  const isCourseSelected = !!selections[course];

                  return (
                    <div key={course} style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                        <input 
                          type="checkbox" 
                          checked={isCourseSelected}
                          onChange={() => toggleCourse(course)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary-blue)' }}
                        />
                        {course}
                      </label>

                      {chapters.length > 0 && (
                        <div style={{ marginLeft: '25px', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {chapters.map(chapter => (
                            <label key={chapter} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                              <input 
                                type="checkbox" 
                                checked={isCourseSelected && selections[course].includes(chapter)}
                                onChange={() => toggleChapter(course, chapter)}
                                style={{ accentColor: 'var(--primary-blue)' }}
                              />
                              {chapter}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button 
                className="btn-primary" 
                onClick={startDrill} 
                disabled={!isAnyCourseSelected} 
                style={{ marginTop: '10px', padding: '15px', fontSize: '1.1rem', opacity: !isAnyCourseSelected ? 0.5 : 1, cursor: !isAnyCourseSelected ? 'not-allowed' : 'pointer' }}
              >
                {t.startBtn}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}