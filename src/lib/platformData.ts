import { supabase } from './supabase';
import type { PetMemberRole, ProEntitlement, WeightEntry } from '../types';

export type PlatformSnapshot = {
  weights: WeightEntry[];
  memberCount: number;
  activePassportCount: number;
  pro: ProEntitlement;
};

const freeEntitlement: ProEntitlement = { plan: 'free' };

export async function loadPlatformSnapshot(userId: string, petId: string): Promise<PlatformSnapshot> {
  if (!supabase) return { weights: [], memberCount: 0, activePassportCount: 0, pro: freeEntitlement };

  const [weightsResult, membersResult, passportResult, entitlementResult] = await Promise.all([
    supabase.from('weight_entries').select('id,pet_id,weight,measured_at,notes').eq('owner_id', userId).eq('pet_id', petId).order('measured_at', { ascending: true }),
    supabase.from('pet_members').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('pet_id', petId).is('revoked_at', null),
    supabase.from('passport_shares').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('pet_id', petId).is('revoked_at', null),
    supabase.from('pro_entitlements').select('plan,provider,product_id,expires_at').eq('user_id', userId).maybeSingle(),
  ]);

  const firstError = weightsResult.error ?? membersResult.error ?? passportResult.error ?? entitlementResult.error;
  if (firstError) throw firstError;

  return {
    weights: (weightsResult.data ?? []).map(row => ({
      id: row.id,
      petId: row.pet_id,
      weight: Number(row.weight),
      measuredAt: row.measured_at,
      notes: row.notes ?? undefined,
    })),
    memberCount: membersResult.count ?? 0,
    activePassportCount: passportResult.count ?? 0,
    pro: entitlementResult.data ? {
      plan: entitlementResult.data.plan === 'pro' ? 'pro' : 'free',
      provider: entitlementResult.data.provider ?? undefined,
      productId: entitlementResult.data.product_id ?? undefined,
      expiresAt: entitlementResult.data.expires_at ?? undefined,
    } : freeEntitlement,
  };
}

export async function addWeightEntry(userId: string, petId: string, weight: number) {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { error } = await supabase.from('weight_entries').insert({ owner_id: userId, pet_id: petId, weight });
  if (error) throw error;
}

export async function invitePetMember(userId: string, petId: string, email: string, role: PetMemberRole) {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { error } = await supabase.from('pet_members').insert({
    owner_id: userId,
    pet_id: petId,
    invite_email: email.trim().toLowerCase(),
    role,
    can_edit: role !== 'viewer',
  });
  if (error) throw error;
}

export async function createPassportShare(userId: string, petId: string, lostMode = false) {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const rawToken = `${petId}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const tokenHash = rawToken.split('').reverse().join('');
  const { error } = await supabase.from('passport_shares').insert({
    owner_id: userId,
    pet_id: petId,
    token_hash: tokenHash,
    lost_mode: lostMode,
    include_owner_contact: lostMode,
  });
  if (error) throw error;
  return rawToken;
}
