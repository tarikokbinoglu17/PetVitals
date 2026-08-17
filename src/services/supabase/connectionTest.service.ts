import { getErrorMessage } from '@/utils/errors';

import { supabase } from './client';

export interface ConnectionTestResult {
  ok: boolean;
  /** Human-readable detail: the raw SDK/network error on failure, empty on success. */
  detail: string;
}

/**
 * Diagnostic check, not part of normal app flow: confirms the app can reach
 * Supabase with the configured URL/anon key by reading a single row from
 * `pets` through the same shared client every other service uses. An empty
 * result is still success — RLS is expected to hide rows from a signed-out
 * user, so "0 rows" and "network/auth error" are deliberately distinguished.
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  try {
    const { error } = await supabase.from('pets').select('id').limit(1);
    if (error) {
      return { ok: false, detail: error.message };
    }
    return { ok: true, detail: '' };
  } catch (err) {
    return { ok: false, detail: getErrorMessage(err) };
  }
}
