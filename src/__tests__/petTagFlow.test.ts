import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePetData } from '../hooks/usePetData';
import { loadPetTag, savePetTag, setPetTagEnabled } from '../lib/petTags';
const { create, act } = require('react-test-renderer');
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../lib/supabase', () => ({ supabase: null }));
jest.mock('../lib/notifications', () => ({ cancelVaccineNotifications: jest.fn(), scheduleVaccineNotifications: jest.fn() }));
let current: ReturnType<typeof usePetData>;
function Probe() { current = usePetData({ demoMode: true }); return null; }
let renderer: any;
beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = undefined; });

test('editing a built-in demo chip survives adding another pet and reopening', async () => {
  await act(async () => { renderer = create(React.createElement(Probe)); });
  const pet = current.pets[0];
  await act(async () => { expect(await current.updatePet(pet.id, { name: pet.name, species: pet.species, microchipId: '000 123 456789012' })).not.toHaveProperty('error'); });
  await act(async () => { await current.addPet({ name: 'Test pet', species: 'Kuş', microchipId: '123456789' }); });
  expect(current.pets.find(p => p.id === pet.id)?.microchipId).toBe('000123456789012');
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(React.createElement(Probe)); });
  expect(current.pets.find(p => p.id === pet.id)?.microchipId).toBe('000123456789012');
  expect(current.pets.find(p => p.name === 'Test pet')?.microchipId).toBe('123456789');
});

test('demo collar saves and pauses locally without creating a public bearer token', async () => {
  const draft = { contact_phone: '+1 (202) 555-0123', contact_name: 'Demo', finder_message: '', lost_mode: false };
  const tag = await savePetTag('demo-pet', draft, true);
  expect(tag.token).toBe('');
  expect(tag.contact_phone).toBe('+12025550123');
  const lost = await savePetTag('demo-pet', { ...draft, lost_mode: true }, true, undefined, tag);
  expect((await loadPetTag('demo-pet', true))?.lost_mode).toBe(true);
  const paused = await setPetTagEnabled(lost, false, true);
  expect((await loadPetTag('demo-pet', true))?.enabled).toBe(false);
  expect((await setPetTagEnabled(paused, true, true)).enabled).toBe(true);
  expect(await loadPetTag('another-pet', true)).toBeNull();
});

test('real collars require an authenticated backend and do not fall back to demo', async () => {
  await expect(loadPetTag('real-pet', false)).rejects.toThrow('SIGN_IN_REQUIRED');
  await expect(savePetTag('real-pet', { contact_phone: '+12025550123', contact_name: '', finder_message: '', lost_mode: false }, false)).rejects.toThrow('SIGN_IN_REQUIRED');
});
