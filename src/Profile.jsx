import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Profile({ session, onBack, isAdmin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Hiba a belépésnél: ' + error.message);
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!username) return alert('Kérlek adj meg egy felhasználónevet!');
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { username: username } }
    });

    if (error) {
      alert('Hiba a regisztrációnál: ' + error.message);
    } else {
      alert('Sikeres regisztráció! Most már be tudsz lépni.');
      setEmail('');
      setPassword('');
      setUsername('');
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div style={{ width: '400px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      
      {onBack && (
        <button className="btn-outline" onClick={onBack} style={{ marginBottom: '20px', border: 'none' }}>
          ⬅️ Vissza a főmenübe
        </button>
      )}
      
      <div className="card">
        <h2 style={{ color: '#0A74DA', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {session ? '👤 Profilom' : '👋 Üdvözlünk!'}
          
          {/* ÚJ: ADMIN JELVÉNY */}
          {isAdmin && (
            <span style={{ 
              fontSize: '12px', background: '#F59E0B', color: 'white', 
              padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' 
            }}>
              👑 ADMIN
            </span>
          )}
        </h2>

        {session ? (
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            <div style={{ background: 'var(--light-blue)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '5px 0', color: 'var(--text-light)' }}>Felhasználónév</p>
              <h3 style={{ margin: 0 }}>{session.user.user_metadata?.username || 'Nincs megadva'}</h3>
            </div>
            
            <div style={{ background: '#F3F4F6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '5px 0', color: 'var(--text-light)' }}>Email cím</p>
              <h4 style={{ margin: 0 }}>{session.user.email}</h4>
            </div>

            <button className="btn-primary" onClick={handleLogout} style={{ width: '100%', background: '#EF4444' }}>
              Kijelentkezés
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <p style={{ color: 'var(--text-light)', marginBottom: '25px' }}>
              Jelentkezz be, vagy regisztrálj a Chess Drill Master használatához!
            </p>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                className="input-field"
                placeholder="Felhasználónév (regisztrációhoz)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input 
                type="email" 
                className="input-field"
                placeholder="Email cím" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                className="input-field"
                placeholder="Jelszó (min. 6 karakter)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ flex: 1 }}>
                  {loading ? '...' : 'Belépés'}
                </button>
                <button className="btn-outline" onClick={handleRegister} disabled={loading} style={{ flex: 1 }}>
                  Regisztráció
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}