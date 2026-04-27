// pages/_app.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import Navbar from '../components/Navbar';

// Inner component so hooks can access session from parent
function AppContent({ Component, pageProps, session }) {
  const { unreadCount, markAllRead } = useNotifications(session?.user?.id);

  return (
    <>
      <Navbar
        user={session?.user}
        unreadCount={unreadCount}
        onMarkRead={markAllRead}
      />
      <Component {...pageProps} />
    </>
  );
}

export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Get the existing session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // 3. Cleanup listener on unmount
    return () => subscription.unsubscribe();
  }, []);

  return <AppContent Component={Component} pageProps={pageProps} session={session} />;
}