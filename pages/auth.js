import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient'; 

export default function Auth() {
  const router = useRouter();

 
  const [email, setEmail] = useState('');         
  const [password, setPassword] = useState('');   
  const [message, setMessage] = useState('');     
  const [isError, setIsError] = useState(false); 
  const [loading, setLoading] = useState(false);  

// --- Updated Sign Up Function ---
  const handleSignUp = async () => {
    if (!email || !password) {
      setIsError(true);
      setMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
    });

    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setIsError(false);
      setMessage('Sign-up successful! You can now try to log in.');
    }
    setLoading(false);
  };
            // auth.js - Inside handleSignUp
  if (error) {
   setIsError(true);
   setMessage(error.message);
  } else {
   setIsError(false);
   setMessage('Sign-up successful! Redirecting to dashboard...');
  // Add this line so they don't have to log in manually after signing up
  setTimeout(() => router.push('/dashboard'), 1500); 
}
  // --- Updated Login Function ---
  const handleLogin = async () => {
    if (!email || !password) {
      setIsError(true);
      setMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setIsError(false);
      setMessage('Login successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1500);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h2 style={styles.title}>Welcome to ML Hub</h2>
        <p style={styles.subtitle}>Sign in or create a new account</p>

        {/* Email Input */}
        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}   
        />

        {/* Password Input */}
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
        />

        {/* Success / Error Message — only shows if message is not empty */}
        {message && (
          <p style={{ ...styles.message, color: isError ? '#f87171' : '#4ade80' }}>
            {message}
            
          </p>
        )}

        {/* Login and Sign Up Buttons */}
        <div style={styles.buttonRow}>
          <button
            style={{ ...styles.button, backgroundColor: '#6366f1' }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: '#0ea5e9' }}
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Sign Up'}
          </button>
        </div>

        {/* Back link */}
        <p style={styles.backLink} onClick={() => router.push('/')}>
          ← Back to Home
        </p>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '48px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.6rem',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginBottom: '28px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    marginBottom: '14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  message: {
    fontSize: '0.9rem',
    marginBottom: '14px',
    textAlign: 'center',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  button: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  backLink: {
    marginTop: '20px',
    color: '#94a3b8',
    fontSize: '0.85rem',
    textAlign: 'center',
    cursor: 'pointer',
  },
};