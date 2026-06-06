import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Courses({ onBack, session, isAdmin }) {
  const [drillLista, setDrillLista] = useState([]);
  const [myRepertoire, setMyRepertoire] = useState([]);
  const [loadingKategoria, setLoadingKategoria] = useState(null);

  useEffect(() => { 
    fetchList(); 
    if (session) fetchRepertoire();
  }, [session]);

  async function fetchList() {
    // KULCS VÁLTOZÁS: Lekérünk mindent, és NINCS többé szűrés! Mindenki lát mindent.
    const { data, error } = await supabase.from('variaciok').select('*');
    if (error) {
      console.error("Hiba a kurzusok lekérésekor:", error);
      return;
    }
    if (data) {
      setDrillLista(data);
    }
  }

  async function fetchRepertoire() {
    const { data, error } = await supabase.from('user_repertoires').select('kategoria').eq('user_id', session.user.id);
    if (error) {
      console.error("Hiba a repertoár lekérésekor:", error);
      return;
    }
    if (data) {
      setMyRepertoire(data.map(item => item.kategoria));
    }
  }

  async function toggleRepertoire(kategoria) {
    if (!session) return alert('Be kell jelentkezned a repertoár építéséhez!');

    setLoadingKategoria(kategoria); 
    
    try {
      if (myRepertoire.includes(kategoria)) {
        const { data, error } = await supabase
          .from('user_repertoires')
          .delete()
          .eq('user_id', session.user.id)
          .eq('kategoria', kategoria)
          .select(); 

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Az adatbázis megtagadta a törlést!");

        setMyRepertoire(prev => prev.filter(k => k !== kategoria));
        
      } else {
        const { data, error } = await supabase
          .from('user_repertoires')
          .insert([{ user_id: session.user.id, kategoria }])
          .select(); 

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Az adatbázis megtagadta a mentést!");

        setMyRepertoire(prev => [...prev, kategoria]);
      }
    } catch (error) {
      console.error("Adatbázis hiba:", error);
      alert(`Művelet sikertelen: ${error.message}`);
    } finally {
      setLoadingKategoria(null); 
    }
  }

  const courses = {};
  drillLista.forEach(drill => {
    if (!courses[drill.kategoria]) {
      courses[drill.kategoria] = { 
        nev: drill.kategoria, 
        allapot: drill.allapot,
        szerzo: drill.szerzo_nev === '' ? null : (drill.szerzo_nev || 'Névtelen'), 
        count: 0
      };
    }
    courses[drill.kategoria].count++;
  });

  return (
    <div className="center-container" style={{ maxWidth: '700px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Vissza a főmenübe</button>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: 'var(--primary-blue)', margin: '0 0 10px 0' }}>📚 Kurzusok (Közösségi Mappák)</h2>
      </div>
      
      {!session && <p style={{ color: '#EF4444', fontWeight: 'bold', textAlign: 'center' }}>Jelentkezz be a repertoárépítéshez!</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {Object.values(courses)
          .sort((a, b) => (b.allapot === 'alap') - (a.allapot === 'alap'))
          .map(c => {
          const isAdded = myRepertoire.includes(c.nev);
          const isLoading = loadingKategoria === c.nev;
          
          return (
            <div key={c.nev} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0' }}>
                  📂 {c.nev}
                </h3>
                
                {c.allapot === 'alap' ? (
                  <span style={{ display: 'inline-block', margin: '5px 0', background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>⭐ Hivatalos Kurzus</span>
                ) : (
                  <p style={{ margin: '5px 0', fontSize: '14px', color: 'var(--text-light)' }}>Létrehozta: <strong>{c.szerzo || 'Felhasználó'}</strong></p>
                )}
                
                <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>Variációk: <strong>{c.count} db</strong></p>
              </div>
              
              <button 
                className={isAdded ? "btn-primary" : "btn-outline"}
                onClick={() => toggleRepertoire(c.nev)}
                disabled={isLoading}
                style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? '⏳ Feldolgozás...' : (isAdded ? '✅ Repertoárban' : '➕ Hozzáadás')}
              </button>
            </div>
          );
        })}
      </div>
      
      {Object.values(courses).length === 0 && <p style={{ textAlign: 'center' }}>Nincs elérhető kurzus.</p>}
    </div>
  );
}