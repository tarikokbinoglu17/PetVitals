import type { Session } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';
import type { User, UserRole } from '@/types/user';

import { supabase } from './client';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function mapProfileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

/**
 * Creates the auth user. The matching `profiles` row is created server-side
 * by the `handle_new_user` trigger (see supabase/migrations/0001_init.sql),
 * so there is no separate insert call here to avoid a race with RLS.
 */
export async function signUpWithEmail({ email, password, fullName, role }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'petvitals://reset-password',
  });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

export async function fetchCurrentUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return mapProfileToUser(data);
}
