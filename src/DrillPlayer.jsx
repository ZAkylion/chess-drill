import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import DrillGame from './DrillGame';
import { translations } from './translations';

export default function DrillPlayer({ onBack, session, settings }) {
  const [drills, setDrills] = useState([]);
  const [selections, setSelections] = useState({});
  const [playingDrills, setPlayingDrills] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lang = settings?.language || 'hu';
  const t = translations[lang];

  useEffect(() => {
    fetchDrills();
  }, [session]);

  async function fetchDrills() {
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let finalDrills = [];

      const { data: repData, error: err2 } = await supabase
        .from('user_repertoires')
        .select('kategoria')
        .eq('user_id', session.user.id);

      if (err2) console.error("❌ Hiba a repertoár lekérésénél:", err2);

      if (repData && repData.length > 0) {
        const categories = repData.map(r => r.kategoria);
        
        const { data: repDrills, error: err3 } = await supabase
          .from('variaciok')
          .select('*')
          .in('kategoria', categories);
          
        if (err3) console.error("❌ Hiba a kurzusok behúzásánál:", err3);

        if (repDrills) {
          finalDrills = repDrills;
        }
      }

      setDrills(finalDrills);
    } catch (error) {
      console.error("❌ Végzetes hiba a gyakorlatok betöltésekor:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const courseStructure = useMemo(() => {
    const map = {};
    drills.forEach(d => {
      if (!d.kategoria) return;
      if (!map[d.kategoria]) map[d.kategoria] = new Set();
      if (d.chapter) map[d.kategoria].add(d.chapter);
    });
    return map;
  }, [drills]);

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

  function startDrill() {
    const toPlay = drills.filter(d => {
      if (!d.kategoria || !selections[d.kategoria]) return false;
      if (d.chapter && !selections[d.kategoria].includes(d.chapter)) return false;
      return true;
    });

    if (toPlay.length === 0) return;
    
    const finalDrills = [...toPlay].sort(() => Math.random() - 0.5);
    
    setPlayingDrills(finalDrills);
    setCurrentIndex(0);
    setResults([]);
    setFinished(false);
  }

  // ÚJ FÜGGVÉNY: Csak a hibás feladatok újratöltése
  function practiceMistakes() {
    // Kiszűrjük azokat a feladatokat a results tömbből, ahol volt hiba
    const missedDrills = results.filter(r => r.hibak > 0).map(r => r.drill);
    
    if (missedDrills.length === 0) return;

    // Megkeverjük őket, hogy ne ugyanabban a sorrendben jöjjenek
    const finalDrills = [...missedDrills].sort(() => Math.random() - 0.5);

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
    const hibatlan = results.filter(r => r.hibak === 0).length;
    const hibas = results.filter(r => r.hibak > 0).length;
    const total = results.length;

    const radius = 55;
    const circumference = 2 * Math.PI * radius;
    const hibatlanPercent = total > 0 ? (hibatlan / total) : 0;
    const strokeDasharray = `${hibatlanPercent * circumference} ${circumference}`;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
        <div className="card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center', padding: '35px 25px' }}>
          
          <h2 style={{ color: 'var(--primary-blue)', margin: '0 0 25px 0', fontSize: '26px' }}>{t.practiceEnd || 'Gyakorlás vége!'}</h2>
          
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 30px auto' }}>
            <svg width="160" height="160" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#FCA5A5" strokeWidth="16" />
              <circle 
                cx="70" cy="70" r={radius} 
                fill="transparent" stroke="#10B981" strokeWidth="16" 
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                transform="rotate(-90 70 70)" 
                style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#111827', lineHeight: '1' }}>{total}</span>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 'bold' }}>{lang === 'en' ? 'drills' : 'feladat'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '25px', background: '#F9FAFB', padding: '15px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#10B981', fontWeight: '900', fontSize: '22px' }}>{hibatlan}</div>
              <div style={{ fontSize: '13px', color: '#4B5563', fontWeight: 'bold' }}>{lang === 'en' ? 'Flawless' : 'Hibátlan'}</div>
            </div>
            <div style={{ width: '1px', background: '#D1D5DB' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#EF4444', fontWeight: '900', fontSize: '22px' }}>{hibas}</div>
              <div style={{ fontSize: '13px', color: '#4B5563', fontWeight: 'bold' }}>{lang === 'en' ? 'Missed' : 'Elrontott'}</div>
            </div>
          </div>
          
          <p style={{ fontSize: '16px', color: '#374151', marginBottom: '30px' }}>
            {t.mistakesCount || 'Összes rontott lépés a táblán:'} <strong style={{ color: osszHiba > 0 ? '#EF4444' : '#10B981', fontSize: '20px' }}>{osszHiba}</strong>
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={onBack} style={{ flex: '1 1 120px' }}>
              🏠 {lang === 'en' ? 'Main Menu' : 'Főmenü'}
            </button>
            <button className="btn-outline" onClick={() => { setPlayingDrills([]); setFinished(false); }} style={{ flex: '1 1 120px' }}>
              ⚙️ {lang === 'en' ? 'Change Course' : 'Másik kurzus'}
            </button>
            <button className="btn-primary" onClick={startDrill} style={{ flex: '1 1 120px' }}>
              🔄 {t.retryBtn || 'Újra'}
            </button>
            
            {/* ÚJ GOMB: Csak akkor jelenik meg, ha volt legalább 1 elrontott feladat */}
            {hibas > 0 && (
              <button 
                className="btn-primary" 
                onClick={practiceMistakes} 
                style={{ 
                  flex: '1 1 100%', 
                  background: '#EF4444', 
                  borderColor: '#EF4444',
                  marginTop: '5px',
                  boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)'
                }}
              >
                🎯 {lang === 'en' ? 'Practice Mistakes Only' : 'Csak a hibák gyakorlása'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <button className="btn-outline" onClick={onBack}>{t.backToMenu || 'Vissza'}</button>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, color: 'var(--primary-blue)', textAlign: 'center' }}>{t.startPractice || 'Gyakorlás indítása'}</h2>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
              ⏳ {lang === 'en' ? 'Loading courses...' : 'Kurzusok betöltése...'}
            </div>
          ) : drills.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#DC2626', fontWeight: 'bold' }}>
              {t.selectCoursePrompt || 'Nincs a repertoárodban gyakorolható kurzus! Adj hozzá egyet a Kurzusok menüben!'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ 
                background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', 
                padding: '15px', maxHeight: '40vh', overflowY: 'auto' 
              }}>
                <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                  {t.courseSelectLabel || 'Válaszd ki mit szeretnél gyakorolni:'}
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
                {t.startBtn || 'Start'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}