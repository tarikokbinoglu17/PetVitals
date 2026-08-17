import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { ENV } from '@/constants/env';
import type { Database } from '@/types/database.types';

// AsyncStorage's web implementation reads `window.localStorage` directly,
// which crashes when this module runs during server-side rendering (Expo
// Router web with "static" output pre-renders on Node, where `window`
// doesn't exist). Native (iOS/Android) never hits this path. On web in a
// real browser, `window` exists and AsyncStorage works normally; during
// SSR we fall back to a no-op store — there's no session to restore on the
// server anyway, the client re-initializes once it hydrates in the browser.
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};
const authStorage =
  Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

export const supabase = createClient<Database>(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase recommends pausing token auto-refresh while the app is backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
