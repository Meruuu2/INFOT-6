import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  // If user is already logged in, skip the landing page
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.push('/dashboard');
    });
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* App Title */}
        <h1 style={styles.title}>🧠 Machine Learning Hub</h1>

        {/* Short Description */}
        <p style={styles.description}>
          A simple platform for exploring machine learning concepts, resources,
          and tools — all in one place. Sign up to get started on your ML journey.
        </p>

        {/* Button that goes to the login page */}
        <button
          style={styles.button}
          onClick={() => router.push('/auth')}
        >
          Get Started
        </button>

      </div>
    </div>
  );
}

// --- Page Styling (unchanged from your original) ---

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
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2rem',
    marginBottom: '16px',
  },
  description: {
    color: '#94a3b8',
    fontSize: '1rem',
    lineHeight: '1.7',
    marginBottom: '32px',
  },
  button: {
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 32px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
};