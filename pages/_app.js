// pages/_app.js
// FIXES:
//   1. Auth session loads once and stays stable across all page navigations
//   2. useNotifications hook receives userId reliably (not the whole session object)
//   3. Loading screen prevents flash of unauthenticated content
//   4. Navbar always receives correct user + notification props
//   5. Realtime channels clean up properly on logout

import "@/styles/globals.css";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import navBar from '../components/navBar';

// ─── Inner component ──────────────────────────────────────────────────────────
// Separated so hooks (useNotifications) always have a valid userId to work with
function AppContent({ Component, pageProps, session }) {
  // Pass userId (string) not session object — hook only needs the id
  const userId = session?.user?.id ?? null;
  const { notifications, unreadCount, markRead } = useNotifications(userId);

  return (
    <>
      <navBar
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
    //    This fires on every navigation — keeps session in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Cleanup subscription when app unmounts
    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen while we check for an existing session
  // Prevents the login page from flashing before redirect
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