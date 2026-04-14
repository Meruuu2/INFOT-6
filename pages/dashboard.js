import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null); 

  
  useEffect(() => {
    const getUser = async () => {
      
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        
        router.push('/auth');
      } else {
        
        setUser(session.user);
      }
    };
    getUser();
  }, [router]);

  // --- Logout Function ---
  const handleLogout = async () => {
    await supabase.auth.signOut(); 
    router.push('/');              
  };

  
  if (!user) return (
    <p style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>
      Loading...
    </p>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h2 style={styles.title}>🎉 Welcome to ML Hub!</h2>

        {/* Show the logged-in user's email */}
        <p style={styles.email}>
          Logged in as: <strong>{user.email}</strong>
        </p>

        <p style={styles.message}>
          You are now authenticated. Explore machine learning resources, tools, and more.
        </p>

        {/* Logout Button */}
        <button style={styles.button} onClick={handleLogout}>
          Logout
        </button>

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
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.8rem',
    marginBottom: '12px',
  },
  email: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginBottom: '16px',
  },
  message: {
    color: '#64748b',
    fontSize: '0.9rem',
    marginBottom: '28px',
    lineHeight: '1.6',
  },
  button: {
    backgroundColor: '#ef4444',  
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 28px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};