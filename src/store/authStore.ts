import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import * as authService from '@/services/supabase/auth.service';
import type { SignUpParams } from '@/services/supabase/auth.service';
import type { User } from '@/types/user';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
  /** Loads the current session and subscribes to future changes. Returns an unsubscribe function. */
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
}

async function applySession(session: Session | null, set: (partial: Partial<AuthState>) => void) {
  if (!session) {
    set({ status: 'unauthenticated', session: null, user: null });
    return;
  }
  try {
    const user = await authService.fetchCurrentUserProfile(session.user.id);
    set({ status: 'authenticated', session, user, error: null });
  } catch (err) {
    set({
      status: 'unauthenticated',
      session: null,
      user: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  session: null,
  user: null,
  error: null,

  initialize: () => {
    set({ status: 'loading' });
    void authService
      .getSession()
      .then((session) => applySession(session, set))
      .catch((err: unknown) => {
        set({ status: 'unauthenticated', error: err instanceof Error ? err.message : String(err) });
      });

    return authService.onAuthStateChange((session) => {
      void applySession(session, set);
    });
  },

  signIn: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      await authService.signInWithEmail(email, password);
    } catch (err) {
      set({ status: 'unauthenticated', error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  signUp: async (params) => {
    set({ status: 'loading', error: null });
    try {
      await authService.signUpWithEmail(params);
    } catch (err) {
      set({ status: 'unauthenticated', error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ status: 'unauthenticated', session: null, user: null });
  },
}));
