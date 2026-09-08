import { Session, User } from '@supabase/supabase-js';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { signInWithSocialProvider, SocialProvider } from '../lib/socialAuth';

type AuthResult = { error?: string; message?: string };
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithSocial: (provider: SocialProvider) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function demoRequested() {
  return typeof window !== 'undefined' &&
    new URLSearchParams(window.location?.search ?? '').get('demo') === '1';
}

function updateDemoUrl(enabled: boolean) {
  if (typeof window === 'undefined' || !window.location?.href || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (enabled) url.searchParams.set('demo', '1');
  else url.searchParams.delete('demo');
  window.history.replaceState(window.history.state, '', url.toString());
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [demoMode, setDemoMode] = useState(demoRequested);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: demoMode ? null : session?.user ?? null,
    session: demoMode ? null : session,
    loading: loading && !demoMode,
    demoMode,
    enterDemo: () => { updateDemoUrl(true); setDemoMode(true); },
    signInWithSocial: signInWithSocialProvider,
    signIn: async (email, password) => {
      if (!supabase) return { error: 'Supabase ayarları eksik. Demo modu ile devam edebilirsiniz.' };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { error: error.message } : {};
    },
    signUp: async (name, email, password) => {
      if (!supabase) return { error: 'Supabase ayarları eksik. Demo modu ile devam edebilirsiniz.' };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) return { error: error.message };
      return data.session ? {} : { message: 'E-posta adresinize gönderilen onay bağlantısını açın.' };
    },
    signOut: async () => {
      if (demoMode) {
        updateDemoUrl(false);
        setDemoMode(false);
        return;
      }
      if (supabase) await supabase.auth.signOut();
    },
  }), [demoMode, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return value;
}
