import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { supabase } from './lib/supabase';
import { useStore } from './lib/store';
import { AuthPage } from './components/AuthPage';
import { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const loadAll = useStore(s => s.loadAll);
  const subscribeToChanges = useStore(s => s.subscribeToChanges);
  const loading = useStore(s => s.loading);

  useEffect(() => {
    // Clear old localStorage data from previous version
    const oldKey = '12-week-year-storage';
    if (localStorage.getItem(oldKey)) {
      localStorage.removeItem(oldKey);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session); }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadAll().then(() => {
        const unsub = subscribeToChanges();
        return unsub;
      });
    }
  }, [session]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-muted-foreground text-lg">Syncing data...</div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;
