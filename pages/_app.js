import "@/styles/globals.css";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import Navbar from '../components/Navbar';

// ─── Inner component — hooks can safely run here ──────────────────────────────
function AppContent({ Component, pageProps, session }) {
  const userId = session?.user?.id ?? null;
  const { notifications, unreadCount, markRead } = useNotifications(userId);

  return (
    <>
      <Navbar
        user={session?.user}
        unreadCount={unreadCount}
        notifications={notifications}
        onMarkRead={markRead}
      />
      <Component {...pageProps} />
    </>
  );
}

// ─── Root App — owns the auth session ────────────────────────────────────────
export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get existing session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for login / logout / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#0f172a',
        color: '#94a3b8', fontSize: '1rem',
      }}>
        Loading...
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