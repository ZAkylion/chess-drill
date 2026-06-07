import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations'; // ÚJ IMPORT

export default function Profile({ session, onBack, isAdmin, settings }) { // ÚJ: settings prop
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // ÚJ: Nyelv beállítása
  const lang = settings?.language || 'hu';
  const t = translations[lang];

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(t.errorLogin + error.message);
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!username) return alert(t.missingUsername);
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { username: username } }
    });

    if (error) {
      alert(t.errorRegister + error.message);
    } else {
      alert(t.successRegister);
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
          {t.backToMenu}
        </button>
      )}
      
      <div className="card">
        <h2 style={{ color: '#0A74DA', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {session ? t.profileTitle : t.welcomeAuth}
          
          {/* ADMIN JELVÉNY */}
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
              <p style={{ margin: '5px 0', color: 'var(--text-light)' }}>{t.usernameLabel}</p>
              <h3 style={{ margin: 0 }}>{session.user.user_metadata?.username || t.notProvided}</h3>
            </div>
            
            <div style={{ background: '#F3F4F6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '5px 0', color: 'var(--text-light)' }}>{t.emailLabel}</p>
              <h4 style={{ margin: 0 }}>{session.user.email}</h4>
            </div>

            <button className="btn-primary" onClick={handleLogout} style={{ width: '100%', background: '#EF4444' }}>
              {t.logoutBtn}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <p style={{ color: 'var(--text-light)', marginBottom: '25px' }}>
              {t.authPrompt}
            </p>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                className="input-field"
                placeholder={t.usernamePlaceholder} 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input 
                type="email" 
                className="input-field"
                placeholder={t.emailPlaceholder} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                className="input-field"
                placeholder={t.passwordPlaceholder} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ flex: 1 }}>
                  {loading ? t.loadingDots : t.loginBtn}
                </button>
                <button className="btn-outline" onClick={handleRegister} disabled={loading} style={{ flex: 1 }}>
                  {t.registerBtn}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}