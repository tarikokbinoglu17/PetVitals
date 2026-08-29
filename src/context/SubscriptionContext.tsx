import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getBillingState,
  isUserCancelledPurchase,
  purchaseBillingPlan,
  restoreBillingPurchases,
  revenueCatConfigured,
  type BillingPlanId,
  type BillingPrices,
} from "../lib/billing";
import { supabase } from "../lib/supabase";

const TRIAL_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;

export type AccessState = "loading" | "trial" | "expired" | "subscribed";
type SubscriptionRow = { trial_started_at: string; subscribed: boolean };
type CachedAccess = SubscriptionRow & { cached_at: string };
type SubscriptionContextValue = {
  accessState: AccessState;
  trialDaysRemaining: number;
  trialEndsAt?: number;
  billingAvailable: boolean;
  billingBusy: boolean;
  billingError?: string;
  prices: BillingPrices;
  refresh: () => Promise<void>;
  purchase: (plan: BillingPlanId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  clearBillingError: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

function accessFor(startedAt: number, subscribed: boolean) {
  if (subscribed) {
    return {
      accessState: "subscribed" as const,
      trialDaysRemaining: 0,
      trialEndsAt: undefined,
    };
  }
  const trialEndsAt = startedAt + TRIAL_LENGTH_MS;
  const remainingMs = trialEndsAt - Date.now();
  return {
    accessState: remainingMs > 0 ? ("trial" as const) : ("expired" as const),
    trialDaysRemaining: Math.max(
      0,
      Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    ),
    trialEndsAt,
  };
}

export function SubscriptionProvider({
  children,
  userKey,
}: {
  children: React.ReactNode;
  userKey: string;
}) {
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [trialEndsAt, setTrialEndsAt] = useState<number | undefined>();
  const [billingAvailable, setBillingAvailable] = useState(
    revenueCatConfigured && userKey !== "demo",
  );
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string>();
  const [prices, setPrices] = useState<BillingPrices>({});
  const storagePrefix = `petsolea_access_${userKey}`;

  const apply = useCallback(
    (startedAt: number, subscribed: boolean) => {
      const state = accessFor(startedAt, subscribed);
      setAccessState(state.accessState);
      setTrialDaysRemaining(state.trialDaysRemaining);
      setTrialEndsAt(state.trialEndsAt);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setAccessState("loading");
    setBillingError(undefined);
    let storeSubscribed = false;

    if (userKey !== "demo") {
      try {
        const store = await getBillingState(userKey);
        setBillingAvailable(store.configured);
        setPrices(store.prices);
        storeSubscribed = store.subscribed;
      } catch (error) {
        setBillingAvailable(revenueCatConfigured);
        setBillingError(
          error instanceof Error
            ? error.message
            : "Mağaza abonelik bilgisi alınamadı.",
        );
      }
    } else {
      setBillingAvailable(false);
      setPrices({});
    }

    if (userKey !== "demo" && supabase) {
      const db = supabase as any;
      const query = await db
        .from("subscription_access")
        .select("trial_started_at,subscribed")
        .eq("user_id", userKey)
        .maybeSingle();
      if (!query.error) {
        let row = query.data as SubscriptionRow | null;
        if (!row) {
          const inserted = await db
            .from("subscription_access")
            .insert({ user_id: userKey })
            .select("trial_started_at,subscribed")
            .single();
          row = (inserted.data ?? null) as SubscriptionRow | null;
        }
        if (row?.trial_started_at) {
          const cached: CachedAccess = {
            ...row,
            subscribed: Boolean(row.subscribed) || storeSubscribed,
            cached_at: new Date().toISOString(),
          };
          await AsyncStorage.setItem(
            `${storagePrefix}_server`,
            JSON.stringify(cached),
          );
          apply(
            new Date(row.trial_started_at).getTime(),
            Boolean(row.subscribed) || storeSubscribed,
          );
          return;
        }
      }

      const cachedValue = await AsyncStorage.getItem(`${storagePrefix}_server`);
      if (cachedValue) {
        try {
          const cached = JSON.parse(cachedValue) as CachedAccess;
          apply(
            new Date(cached.trial_started_at).getTime(),
            Boolean(cached.subscribed) || storeSubscribed,
          );
          return;
        } catch {
          // Continue to the local fallback when the cache is unreadable.
        }
      }
    }

    let startedAt = Number(
      await AsyncStorage.getItem(`${storagePrefix}_trial_started_at`),
    );
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      await AsyncStorage.setItem(
        `${storagePrefix}_trial_started_at`,
        String(startedAt),
      );
    }
    apply(startedAt, storeSubscribed);
  }, [apply, storagePrefix, userKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (plan: BillingPlanId) => {
      if (userKey === "demo") {
        setBillingError("Satın alma için gerçek bir hesapla giriş yapın.");
        return false;
      }
      setBillingBusy(true);
      setBillingError(undefined);
      try {
        await purchaseBillingPlan(userKey, plan);
        setAccessState("subscribed");
        setTrialDaysRemaining(0);
        setTrialEndsAt(undefined);
        return true;
      } catch (error) {
        if (isUserCancelledPurchase(error)) return false;
        setBillingError(
          error instanceof Error ? error.message : "Satın alma tamamlanamadı.",
        );
        return false;
      } finally {
        setBillingBusy(false);
      }
    },
    [userKey],
  );

  const restore = useCallback(async () => {
    if (userKey === "demo") {
      setBillingError("Geri yükleme için gerçek bir hesapla giriş yapın.");
      return false;
    }
    setBillingBusy(true);
    setBillingError(undefined);
    try {
      await restoreBillingPurchases(userKey);
      setAccessState("subscribed");
      setTrialDaysRemaining(0);
      setTrialEndsAt(undefined);
      return true;
    } catch (error) {
      setBillingError(
        error instanceof Error ? error.message : "Satın alımlar yüklenemedi.",
      );
      return false;
    } finally {
      setBillingBusy(false);
    }
  }, [userKey]);

  const value = useMemo(
    () => ({
      accessState,
      trialDaysRemaining,
      trialEndsAt,
      billingAvailable,
      billingBusy,
      billingError,
      prices,
      refresh,
      purchase,
      restore,
      clearBillingError: () => setBillingError(undefined),
    }),
    [
      accessState,
      billingAvailable,
      billingBusy,
      billingError,
      prices,
      purchase,
      refresh,
      restore,
      trialDaysRemaining,
      trialEndsAt,
    ],
  );
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) {
    throw new Error("useSubscription must be used inside SubscriptionProvider");
  }
  return value;
}
