import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const TRIAL_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;

type AccessState = 'loading' | 'trial' | 'expired' | 'subscribed';

type SubscriptionContextValue = {
  accessState: AccessState;
  trialDaysRemaining: number;
  trialEndsAt?: number;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function applyTrialState(startedAt: number, subscribed: boolean, setAccessState: (value: AccessState) => void, setTrialDaysRemaining: (value: number) => void, setTrialEndsAt: (value: number | undefined) => void) {
  if (subscribed) {
    setAccessState('subscribed');
    setTrialDaysRemaining(0);
    setTrialEndsAt(undefined);
    return;
  }
  const endsAt = startedAt + TRIAL_LENGTH_MS;
  const remainingMs = endsAt - Date.now();
  setTrialEndsAt(endsAt);
  setTrialDaysRemaining(Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))));
  setAccessState(remainingMs > 0 ? 'trial' : 'expired');
}

export function SubscriptionProvider({ children, userKey }: { children: React.ReactNode; userKey: string }) {
  const [accessState, setAccessState] = useState<AccessState>('loading');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [trialEndsAt, setTrialEndsAt] = useState<number | undefined>();
  const storagePrefix = `petvitals_access_${userKey}`;

  async function refresh() {
    setAccessState('loading');

    if (userKey !== 'demo' && supabase) {
      const { data, error } = await supabase
        .from('subscription_access')
        .select('trial_started_at,subscribed')
        .eq('user_id', userKey)
        .maybeSingle();

      if (!error) {
        let row = data;
        if (!row) {
          const inserted = await supabase
            .from('subscription_access')
            .insert({ user_id: userKey })
            .select('trial_started_at,subscribed')
            .single();
          row = inserted.data;
        }
        if (row?.trial_started_at) {
          applyTrialState(new Date(row.trial_started_at).getTime(), Boolean(row.subscribed), setAccessState, setTrialDaysRemaining, setTrialEndsAt);
          return;
        }
      }
    }

    const subscribed = (await AsyncStorage.getItem(`${storagePrefix}_subscribed`)) === 'true';
    let startedAt = Number(await AsyncStorage.getItem(`${storagePrefix}_trial_started_at`));
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      await AsyncStorage.setItem(`${storagePrefix}_trial_started_at`, String(startedAt));
    }
    applyTrialState(startedAt, subscribed, setAccessState, setTrialDaysRemaining, setTrialEndsAt);
  }

  useEffect(() => { void refresh(); }, [userKey]);

  const value = useMemo(() => ({ accessState, trialDaysRemaining, trialEndsAt, refresh }), [accessState, trialDaysRemaining, trialEndsAt]);
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return value;
}
