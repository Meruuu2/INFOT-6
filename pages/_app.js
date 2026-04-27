import "@/styles/globals.css"; // Keep your global styles at the top
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import Navbar from '../components/Navbar';

// This inner component handles the features that require a user session (like notifications)
function AppContent({ Component, pageProps, session }) {
  const userId = session?.user?.id ?? null;
  
  // Custom hook to fetch and manage notifications for the logged-in user
  const { notifications, unreadCount, markRead } = useNotifications(userId);

  return (
    <>
      <Navbar
        user={session?.user}
        unreadCount={unreadCount}
        notifications={notifications}
        onMarkRead={markRead}
      />
      {/* This renders the actual page content (Dashboard, etc.) */}
      <Component {...pageProps} session={session} />
    </>
  );
}

// The Root App manages the Auth lifecycle
export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for an existing session immediately when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for Auth changes (Sign in, Sign out, Token refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false); // Ensure loading is off once we get an event
      }
    );

    // 3. Clean up the subscription when the app is closed
    return () => subscription.unsubscribe();
  }, []);

  // Show a simple loading state while we verify the user's identity
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#fff', backgroundColor: '#0f172a', minHeight: '100vh' }}>
        <p>Loading ML Hub...</p>
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