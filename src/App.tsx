import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { supabase } from './lib/supabase';
import { useStore } from './lib/store';
import { AuthPage } from './components/AuthPage';
import { UpdateChecker } from './components/UpdateChecker';
import { AuthSession } from './lib/supabase';

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const loadAll = useStore(s => s.loadAll);
  const subscribeToChanges = useStore(s => s.subscribeToChanges);
  const loading = useStore(s => s.loading);

  useEffect(() => {
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
    let unsub: (() => void) | undefined;
    let cancelled = false;

    if (session) {
      loadAll().then(() => {
        if (!cancelled) {
          unsub = subscribeToChanges();
        }
      });
    }

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [session, loadAll, subscribeToChanges]);

  if (authLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-muted-foreground text-lg">Loading...</div>
        </div>
        <UpdateChecker />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <AuthPage />
        <UpdateChecker />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-muted-foreground text-lg">Syncing data...</div>
        </div>
        <UpdateChecker />
      </>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <UpdateChecker />
    </>
  );
}

export default App;
