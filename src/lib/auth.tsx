import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signInMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  let mounted = true;

  async function bootstrap(sess: Session | null) {
    if (!mounted) return;

    setSession(sess);
    setLoading(false);

    // Se tiver sessão, garante tarefas do dia (não bloqueia login se falhar)
    if (sess) {
      try {
        const { error } = await supabase.rpc('ensure_daily_tasks');
        if (error) console.warn('ensure_daily_tasks error:', error.message);
      } catch (e) {
        console.warn('ensure_daily_tasks exception:', e);
      }
    }
  }

  supabase.auth.getSession().then(({ data }) => {
    bootstrap(data.session ?? null);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
    bootstrap(sess);
  });

  return () => {
    mounted = false;
    sub.subscription.unsubscribe();
  };
}, []);

  const value = useMemo<AuthCtx>(() => {
    const user = session?.user ?? null;
    return {
      user,
      session,
      loading,
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUpWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      signInMagicLink: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
