import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Courses({ onBack, session, isAdmin }) {
  const [drillLista, setDrillLista] = useState([]);
  const [myRepertoire, setMyRepertoire] = useState([]);

  useEffect(() => { 
    fetchList(); 
    if (session) fetchRepertoire();
  }, [session]);

  async function fetchList() {
    const { data } = await supabase.from('variaciok').select('*');
    if (data) {
      // Admin mindent lát, felhasználók csak az alapokat, publikusokat és a saját privátjaikat
      const lathatoDrillek = data.filter(d => 
        d.allapot === 'alap' || d.allapot === 'publikus' || (session && d.user_id === session.user.id)
      );
      setDrillLista(lathatoDrillek);
    }
  }

  async function fetchRepertoire() {
    const { data } = await supabase.from('user_repertoires').select('kategoria').eq('user_id', session.user.id);
    if (data) {
      setMyRepertoire(data.map(item => item.kategoria));
    }
  }

  async function toggleRepertoire(kategoria) {
    if (!session) return alert('Be kell jelentkezned!');

    if (myRepertoire.includes(kategoria)) {
      await supabase.from('user_repertoires').delete().eq('user_id', session.user.id).eq('kategoria', kategoria);
      setMyRepertoire(myRepertoire.filter(k => k !== kategoria));
    } else {
      await supabase.from('user_repertoires').insert([{ user_id: session.user.id, kategoria }]);
      setMyRepertoire([...myRepertoire, kategoria]);
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
    <div style={{ maxWidth: '700px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Vissza a főmenübe</button>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: 'var(--primary-blue)', margin: '0 0 10px 0' }}>📚 Kurzusok (Mappák)</h2>
      </div>
      
      {!session && <p style={{ color: '#EF4444', fontWeight: 'bold', textAlign: 'center' }}>Jelentkezz be a repertoárépítéshez!</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {Object.values(courses)
          .sort((a, b) => (b.allapot === 'alap') - (a.allapot === 'alap')) // Alap kurzusok előre
          .map(c => {
          const isAdded = myRepertoire.includes(c.nev);
          return (
            <div key={c.nev} className="card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)' }}>
                  📂 {c.nev} {c.allapot === 'privat' && '🔒'}
                </h3>
                
                {c.allapot === 'alap' ? (
                  <span style={{ display: 'inline-block', margin: '5px 0', background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>⭐ Hivatalos Kurzus</span>
                ) : (
                  <p style={{ margin: '5px 0', fontSize: '14px', color: 'var(--text-light)' }}>Szerző: <strong>{c.szerzo}</strong></p>
                )}
                
                <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>Variációk: <strong>{c.count} db</strong></p>
              </div>
              
              <button 
                className={isAdded ? "btn-primary" : "btn-outline"}
                onClick={() => toggleRepertoire(c.nev)}
                style={{ width: '100%', padding: '10px' }}
              >
                {isAdded ? '✅ Repertoárban' : '➕ Hozzáadás'}
              </button>
            </div>
          );
        })}
      </div>
      
      {Object.values(courses).length === 0 && <p style={{ textAlign: 'center' }}>Nincs elérhető kurzus.</p>}
    </div>
  );
}