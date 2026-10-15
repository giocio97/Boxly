import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Link (es. deep link a una scatola) da aprire dopo il login. */
let pendingHref: string | null = null;
export function setPendingHref(href: string | null) {
  pendingHref = href;
}
export function takePendingHref(): string | null {
  const h = pendingHref;
  pendingHref = null;
  return h;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error };
    },
    signUp: async (email, password, displayName) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() || null } },
      });
      if (!error && !data.session) {
        // conferma email disattivata in locale: se manca la sessione, accedi subito
        const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: res.error };
      }
      return { error };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuori da AuthProvider');
  return ctx;
}
