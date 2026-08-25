import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const TRIAL_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;

type AccessState = 'loading' | 'trial' | 'expired' | 'subscribed';

type SubscriptionContextValue = {
  accessState: AccessState;
  trialDaysRemaining: number;
  trialEndsAt?: number;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children, userKey }: { children: React.ReactNode; userKey: string }) {
  const [accessState, setAccessState] = useState<AccessState>('loading');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [trialEndsAt, setTrialEndsAt] = useState<number | undefined>();

  const storagePrefix = `petvitals_access_${userKey}`;

  async function refresh() {
    const subscribed = (await AsyncStorage.getItem(`${storagePrefix}_subscribed`)) === 'true';
    if (subscribed) {
      setAccessState('subscribed');
      setTrialDaysRemaining(0);
      setTrialEndsAt(undefined);
      return;
    }

    let startedAt = Number(await AsyncStorage.getItem(`${storagePrefix}_trial_started_at`));
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      await AsyncStorage.setItem(`${storagePrefix}_trial_started_at`, String(startedAt));
    }

    const endsAt = startedAt + TRIAL_LENGTH_MS;
    const remainingMs = endsAt - Date.now();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    setTrialEndsAt(endsAt);
    setTrialDaysRemaining(remainingDays);
    setAccessState(remainingMs > 0 ? 'trial' : 'expired');
  }

  useEffect(() => {
    void refresh();
  }, [userKey]);

  const value = useMemo(() => ({ accessState, trialDaysRemaining, trialEndsAt, refresh }), [accessState, trialDaysRemaining, trialEndsAt]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return value;
}
