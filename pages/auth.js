import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Verification & Timer States
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(0);

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const showMsg = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  // --- Resend Timer Logic ---
  const startResendTimer = () => {
    setCanResend(false);
    setTimer(300); // 5 minutes in seconds
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) return showMsg("Passwords do not match", true);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          first_name: firstName, 
          last_name: lastName,
          phone_number: phone 
        } 
      }
    });

    if (error) {
      showMsg(error.message, true);
    } else {
      // Ensure profile is created in DB[cite: 1]
      await ensureProfile(data.user);
      setIsVerifying(true);
      showMsg("✅ Code sent! Please check your Gmail.", false);
      startResendTimer();
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    });

    if (error) {
      showMsg("OTP is wrong or has expired.", true);
    } else {
      showMsg("Success! Redirecting to Log In...", false);
      setTimeout(() => {
        setMode('login');
        setIsVerifying(false);
        setMessage('');
        setOtpCode('');
      }, 2000);
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    
    if (error) {
      showMsg(error.message, true);
    } else {
      showMsg("✅ New code sent!", false);
      startResendTimer();
    }
    setLoading(false);
  };

  const ensureProfile = async (user) => {
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      username: email.split('@')[0],
      full_name: `${firstName} ${lastName}`,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.tabRow}>
          <button 
            onClick={() => { setMode('login'); setIsVerifying(false); }} 
            style={mode === 'login' ? styles.tabActive : styles.tab}
          >
            Log In
          </button>
          <button 
            onClick={() => { setMode('signup'); setIsVerifying(false); }} 
            style={mode === 'signup' ? styles.tabActive : styles.tab}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <div style={styles.row}>
            <input style={styles.halfInput} placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input style={styles.halfInput} placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        )}

        {/* Email Row[cite: 1] */}
        <div style={styles.verifyRow}>
          <input style={styles.inputFlex} placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
          {mode === 'signup' && !isVerifying && (
            <button style={styles.verifyBtn} onClick={handleSignUp} disabled={loading}>Verify</button>
          )}
        </div>

        {/* OTP Demand Section - Appears after clicking Verify[cite: 1] */}
        {mode === 'signup' && isVerifying && (
          <div style={styles.otpSection}>
            <input 
              style={styles.input} 
              placeholder="Enter 6-digit OTP" 
              value={otpCode} 
              onChange={(e) => setOtpCode(e.target.value)} 
              maxLength={6} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={styles.resendText}>
                {canResend ? (
                  <span onClick={handleResendCode} style={styles.link}>Resend Code</span>
                ) : (
                  `Resend in ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`
                )}
              </p>
              <button style={styles.confirmBtn} onClick={handleVerifyCode} disabled={loading}>
                Confirm OTP
              </button>
            </div>
          </div>
        )}

        {/* Password Inputs */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input 
            style={styles.input} 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.iconBtn}>
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        
        {mode === 'signup' && (
          <input style={styles.input} type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        )}

        <button 
          style={styles.primaryBtn} 
          onClick={mode === 'login' ? () => {} : handleSignUp}
          disabled={loading || (mode === 'signup' && !isVerifying)}
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
        
        {message && <div style={{...styles.message, color: isError ? '#f87171' : '#4ade80'}}>{message}</div>}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  card: { backgroundColor: '#1e293b', padding: '2.5rem', borderRadius: 12, width: '100%', maxWidth: 450 },
  row: { display: 'flex', gap: '10px', marginBottom: '16px' },
  halfInput: { flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' },
  verifyRow: { display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' },
  inputFlex: { flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' },
  verifyBtn: { padding: '10px 15px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' },
  input: { width: '100%', padding: '12px', marginBottom: '16px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' },
  primaryBtn: { width: '100%', padding: '13px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' },
  tabRow: { display: 'flex', marginBottom: '20px', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' },
  tab: { flex: 1, padding: '10px', background: '#0f172a', color: '#64748b', border: 'none', cursor: 'pointer' },
  tabActive: { flex: 1, padding: '10px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' },
  iconBtn: { position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', cursor: 'pointer' },
  message: { marginTop: '16px', textAlign: 'center', fontSize: '14px' },
  // New Styles Integrated[cite: 1]
  otpSection: { 
    backgroundColor: '#0f172a', 
    padding: '15px', 
    borderRadius: 8, 
    marginBottom: '16px', 
    border: '1px dashed #6366f1' 
  },
  confirmBtn: { 
    padding: '8px 16px', 
    backgroundColor: '#10b981', 
    color: '#fff', 
    border: 'none', 
    borderRadius: 6, 
    cursor: 'pointer',
    fontSize: '12px'
  },
  resendText: { fontSize: '12px', color: '#94a3b8' },
  link: { color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }
};