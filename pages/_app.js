// pages/_app.js
import "@/styles/globals.css";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import Navbar from '../components/Navbar';  // ✅ Fixed: PascalCase import + correct filename
import { Toaster } from 'react-hot-toast';


// ─── Inner component ──────────────────────────────────────────────────────────
// Separated so hooks (useNotifications) always have a valid userId to work with
function AppContent({ Component, pageProps, session }) {
  const userId = session?.user?.id ?? null;
  const { notifications, unreadCount, markRead } = useNotifications(userId);

  return (
    <>
      {/* ✅ Fixed: <Navbar> not <navBar> — lowercase breaks React + DOM */}
      <Toaster position="top-right" reverseOrder={false} /> {/* Add this line */}
      <Navbar
        user={session?.user ?? null}
        unreadCount={unreadCount}
        notifications={notifications}
        onMarkRead={markRead}
      />
      <Component {...pageProps} />
    </>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get existing session immediately on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Subscribe to auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Loading spinner — prevents flash of unauthenticated content
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        fontSize: '1rem',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #334155',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span>Loading...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AppContent
      Component={Component}
      pageProps={pageProps}
      session={session}
    />
  );
}