import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [message,  setMessage]  = useState('');
  const [isError,  setIsError]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [mode,     setMode]     = useState('login'); // 'login' | 'signup'

  const showMsg = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  // ── Sign Up ────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!email || !password) return showMsg('Please enter both email and password.', true);
    if (password.length < 6) return showMsg('Password must be at least 6 characters.', true);

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { full_name: email.split('@')[0] } 
      }
    });

    if (error) {
      showMsg(error.message, true);
    } else {
      // ✅ SUCCESS FLOW: Don't redirect. Notify and switch to Login tab.
      showMsg('✅ Account created successfully! Please log in with your credentials.', false);
      
      setTimeout(() => {
        setMode('login');
        setPassword(''); 
      }, 2000);
    }
    setLoading(false);
  };

  // ── Log In ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) return showMsg('Please enter both email and password.', true);

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login')) {
        showMsg('Incorrect email or password. Please try again.', true);
      } else {
        showMsg(error.message, true);
      }
    } else {
      // ✅ ONLY LOGIN leads to the dashboard.
      await ensureProfile(data.user);
      showMsg('✅ Login successful! Redirecting...', false);
      setTimeout(() => router.push('/dashboard'), 1000);
    }
    setLoading(false);
  };

  const ensureProfile = async (user) => {
    if (!user) return;
    try {
      const username = user.email.split('@')[0];
      await supabase.from('profiles').upsert({
        id: user.id,
        username: username,
        full_name: username,
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('Profile sync error:', err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleSignUp();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
          <h2 style={styles.title}>ML Hub</h2>
          <p style={styles.subtitle}>{mode === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>

        <div style={styles.tabRow}>
          <button style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }} onClick={() => { setMode('login'); setMessage(''); }}>Log In</button>
          <button style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }} onClick={() => { setMode('signup'); setMessage(''); }}>Sign Up</button>
        </div>

        <label style={styles.label}>Email address</label>
        <input style={styles.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} />

        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} />

        {message && (
          <div style={{ ...styles.message, backgroundColor: isError ? '#450a0a' : '#052e16', border: `1px solid ${isError ? '#7f1d1d' : '#14532d'}`, color: isError ? '#f87171' : '#4ade80' }}>
            {message}
          </div>
        )}

        <button style={styles.primaryBtn} onClick={mode === 'login' ? handleLogin : handleSignUp} disabled={loading}>
          {loading ? '⏳ Please wait...' : mode === 'login' ? '→ Log In' : '→ Create Account'}
        </button>

        <p style={styles.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={styles.switchBtn} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

        <p style={styles.backLink} onClick={() => router.push('/')}>← Back to Home</p>
      </div>
    </div>
  );
}

// ✅ Restored missing styles object to fix the TypeError
const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '20px' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: '2.5rem', maxWidth: 420, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', border: '1px solid #334155' },
  title: { color: '#f1f5f9', fontSize: '1.6rem', margin: '0 0 4px', fontWeight: 700 },
  subtitle: { color: '#94a3b8', fontSize: '0.875rem', margin: 0 },
  tabRow: { display: 'flex', marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid #334155' },
  tab: { flex: 1, padding: '10px', border: 'none', backgroundColor: '#0f172a', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  tabActive: { backgroundColor: '#6366f1', color: '#fff' },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px 14px', marginBottom: 16, borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: '1rem', outline: 'none' },
  message: { padding: '10px 14px', borderRadius: 8, fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.5 },
  primaryBtn: { width: '100%', padding: '13px', border: 'none', borderRadius: 8, backgroundColor: '#6366f1', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: 16 },
  switchText: { textAlign: 'center', color: '#64748b', fontSize: '0.875rem', margin: '0 0 16px' },
  switchBtn: { background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer' },
  backLink: { textAlign: 'center', color: '#475569', fontSize: '0.8rem', cursor: 'pointer', margin: 0 },
};