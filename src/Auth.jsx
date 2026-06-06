import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth({ onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // --- BEJELENTKEZÉS ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // --- REGISZTRÁCIÓ ---
        if (!username) throw new Error("A felhasználónév megadása kötelező!");
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username } // Ezt a Supabase elmenti a user_metadata-ba
          }
        });
        
        if (error) throw error;
        alert("Sikeres regisztráció! Most már bejelentkezhetsz.");
        setIsLogin(true); // Átváltjuk bejelentkezés nézetre
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
        <button className="btn-outline" onClick={onBack}>⬅️ Vissza a főoldalra</button>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-blue)', marginBottom: '30px' }}>
          {isLogin ? '👋 Bejelentkezés' : '✨ Regisztráció'}
        </h2>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Regisztrációnál bekérjük a felhasználónevet is */}
          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Felhasználónév</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="pl. SakkMester99" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required={!isLogin} 
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>E-mail cím</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="email@cim.hu" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Jelszó</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
            {loading ? '⏳ Kérlek várj...' : (isLogin ? 'Bejelentkezés' : 'Regisztráció')}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>
            {isLogin ? 'Nincs még fiókod? ' : 'Már van fiókod? '}
          </span>
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontWeight: 'bold', cursor: 'pointer', padding: '0' }}
          >
            {isLogin ? 'Regisztrálj itt!' : 'Jelentkezz be!'}
          </button>
        </div>
      </div>
    </div>
  );
}