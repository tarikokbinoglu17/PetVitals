import React from 'react';
import App from '../../App';
import { PublicPetTagScreen } from '../screens/PublicPetTagScreen';
const { create, act } = require('react-test-renderer');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../context/PreferencesContext', () => ({
  PreferencesProvider: ({ children }: any) => children,
  usePreferences: () => ({ language: 'en', setLanguage: jest.fn() }),
}));
jest.mock('../context/AuthContext', () => ({
  AuthProvider: () => { throw new Error('Public collar must not wait for sign-in'); },
  useAuth: () => { throw new Error('Public collar must not read private auth'); },
}));
jest.mock('../components/AppShell', () => ({ AppShell: () => null }));
jest.mock('../components/AppErrorBoundary', () => ({ AppErrorBoundary: ({ children }: any) => children }));
jest.mock('../screens/AuthScreen', () => ({ AuthScreen: () => null }));
jest.mock('../context/SubscriptionContext', () => ({ SubscriptionProvider: () => { throw new Error('Public collar must not require billing'); } }));
let renderer: any;
const oldWindow = (global as any).window;
const oldFetch = global.fetch;
beforeEach(() => { process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = undefined; (global as any).window = oldWindow; global.fetch = oldFetch; });

test('tag route renders finder details without authentication or subscription gates', async () => {
  (global as any).window = { location: { search: '?tag=9de80bd3-218c-42f5-b1c0-ea6a188d00b7' } };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ name: 'Moka', species: 'dog', breed: '', contactName: 'Demo', contactPhone: '+12025550123', finderMessage: '', lostMode: true }) })) as any;
  await act(async () => { renderer = create(React.createElement(App)); });
  expect(JSON.stringify(renderer.toJSON())).toContain('This pet is missing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Call the contact');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('paused or revoked tag displays no contact buttons', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 404 })) as any;
  await act(async () => { renderer = create(React.createElement(PublicPetTagScreen, { token: '9de80bd3-218c-42f5-b1c0-ea6a188d00b7' })); });
  expect(JSON.stringify(renderer.toJSON())).toContain('unavailable or paused');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Call the contact');
});
test('malformed token never reaches the backend', async () => {
  global.fetch = jest.fn() as any;
  await act(async () => { renderer = create(React.createElement(PublicPetTagScreen, { token: 'malformed' })); });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('unavailable or paused');
});
