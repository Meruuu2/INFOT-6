import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('signup'); // Default to signup as per your image
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleVerifyEmail = async () => {
    setErrorMsg('');
    if (!isValidEmail(email)) {
      setErrorMsg('Unable to validate email address: invalid format');
      return;
    }
    toast.success('Email format valid! Please proceed to Create Account.');
  };

  const handleSignUp = async () => {
    setErrorMsg('');
    if (!isValidEmail(email)) {
      setErrorMsg('Unable to validate email address: invalid format');
      return;
    }
    if (password.length < 8 || password.length > 10) {
      setErrorMsg('Password must be between 8-10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { first_name: firstName, last_name: lastName }
      }
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      toast.success('Verification email sent to Gmail!');
      setMode('login');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.authCard}>
        {/* Toggle Tabs */}
        <div style={styles.tabContainer}>
          <button 
            onClick={() => setMode('login')} 
            style={{...styles.tab, backgroundColor: mode === 'login' ? '#6366f1' : 'transparent', color: mode === 'login' ? 'white' : '#64748b'}}
          >
            Log In
          </button>
          <button 
            onClick={() => setMode('signup')} 
            style={{...styles.tab, backgroundColor: mode === 'signup' ? '#6366f1' : 'transparent', color: mode === 'signup' ? 'white' : '#64748b'}}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <div style={styles.row}>
            <input style={styles.halfInput} placeholder="First Name" onChange={(e) => setFirstName(e.target.value)} />
            <input style={styles.halfInput} placeholder="Last Name" onChange={(e) => setLastName(e.target.value)} />
          </div>
        )}

        <div style={styles.row}>
          <input 
            style={styles.fullInput} 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === 'signup' && (
            <button style={styles.verifyBtn} onClick={handleVerifyEmail}>Verify</button>
          )}
        </div>

        <div style={styles.passwordContainer}>
          <input 
            style={styles.noBorderInput} 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            onChange={(e) => setPassword(e.target.value)}
          />
          <span style={{cursor: 'pointer'}} onClick={() => setShowPassword(!showPassword)}>🙈</span>
        </div>

        {mode === 'signup' && (
          <input 
            style={styles.fullInput} 
            type="password" 
            placeholder="Confirm Password" 
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}

        <button 
          style={styles.actionBtn} 
          onClick={mode === 'login' ? handleLogin : handleSignUp}
          disabled={loading}
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>

        {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', backgroundColor: '#0f172a',
  },
  authCard: {
    backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px',
    width: '100%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  tabContainer: {
    display: 'flex', backgroundColor: '#0f172a', borderRadius: '8px',
    padding: '4px', marginBottom: '25px',
  },
  tab: {
    flex: 1, padding: '10px', border: 'none', borderRadius: '6px',
    cursor: 'pointer', transition: '0.3s', fontWeight: '500',
  },
  row: { display: 'flex', gap: '10px', marginBottom: '15px' },
  halfInput: {
    flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155',
    backgroundColor: '#0f172a', color: 'white',
  },
  fullInput: {
    flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155',
    backgroundColor: '#0f172a', color: 'white', width: '100%',
  },
  verifyBtn: {
    backgroundColor: '#6366f1', color: 'white', border: 'none',
    borderRadius: '8px', padding: '0 20px', cursor: 'pointer',
  },
  passwordContainer: {
    display: 'flex', alignItems: 'center', padding: '12px',
    borderRadius: '8px', border: '1px solid #334155',
    backgroundColor: '#0f172a', color: 'white', marginBottom: '15px',
  },
  noBorderInput: {
    flex: 1, border: 'none', background: 'transparent', color: 'white', outline: 'none',
  },
  actionBtn: {
    width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
    backgroundColor: '#6366f1', color: 'white', fontWeight: 'bold',
    cursor: 'pointer', marginTop: '10px',
  },
  errorText: { color: '#f87171', fontSize: '14px', textAlign: 'center', marginTop: '15px' }
};