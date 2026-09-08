import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Root } from '../../App';
import { getBillingState } from '../lib/billing';

const { create, act } = require('react-test-renderer');
let mockAuthState = { user: null as null | { id: string }, demoMode: true, loading: false };

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock('../lib/billing', () => ({
  revenueCatConfigured: false,
  getBillingState: jest.fn(async () => ({ configured: false, subscribed: false, prices: {} })),
  isUserCancelledPurchase: jest.fn(),
  purchaseBillingPlan: jest.fn(),
  restoreBillingPurchases: jest.fn(),
}));
jest.mock('../context/AuthContext', () => ({ useAuth: () => mockAuthState }));
jest.mock('../screens/AuthScreen', () => ({ AuthScreen: () => null }));
jest.mock('../components/AppShell', () => ({
  AppShell: (props: object) => {
    const React = require('react');
    const { useSubscription } = require('../context/SubscriptionContext');
    const access = useSubscription();
    return React.createElement('access-probe', {
      ...props,
      accessState: access.accessState,
      trialEndsAt: access.trialEndsAt,
    });
  },
}));

describe('demo and account access remain separate', () => {
  let renderer: any;

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockAuthState = { user: null, demoMode: true, loading: false };
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    renderer = undefined;
  });

  it('opens demo with an expired stored demo trial and no billing lookup', async () => {
    await AsyncStorage.setItem('pawly_access_demo_trial_started_at', '1');
    jest.clearAllMocks();
    await act(async () => { renderer = create(React.createElement(Root)); });
    expect(renderer.toJSON().props).toMatchObject({ demoMode: true, accessState: 'demo' });
    expect(renderer.toJSON().props.trialEndsAt).toBeUndefined();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(getBillingState).not.toHaveBeenCalled();
  });

  it('uses demo identity even while an existing account session is loading', async () => {
    mockAuthState = { user: { id: 'expired-user' }, demoMode: true, loading: true };
    await act(async () => { renderer = create(React.createElement(Root)); });
    expect(renderer.toJSON().props).toMatchObject({ demoMode: true, accessState: 'demo' });
    expect(renderer.toJSON().props.userId).toBeUndefined();
    expect(getBillingState).not.toHaveBeenCalled();
  });

  it('can enter demo from an expired account without resetting the real trial', async () => {
    const trialKey = 'pawly_access_expired-user_trial_started_at';
    await AsyncStorage.setItem(trialKey, '1');
    mockAuthState = { user: { id: 'expired-user' }, demoMode: false, loading: false };
    await act(async () => { renderer = create(React.createElement(Root)); });
    expect(renderer.toJSON().props.accessState).toBe('expired');

    mockAuthState = { ...mockAuthState, demoMode: true };
    await act(async () => { renderer.update(React.createElement(Root)); });
    expect(renderer.toJSON().props.accessState).toBe('demo');
    expect(renderer.toJSON().props.userId).toBeUndefined();

    mockAuthState = { ...mockAuthState, demoMode: false };
    await act(async () => { renderer.update(React.createElement(Root)); });
    expect(renderer.toJSON().props.accessState).toBe('expired');
    expect(await AsyncStorage.getItem(trialKey)).toBe('1');
  });
});
