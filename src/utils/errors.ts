/**
 * Extracts a loggable message from an unknown catch value. Used for
 * console diagnostics only — never shown to the user directly, since raw
 * Supabase/Postgres error text isn't localized or user-friendly.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
