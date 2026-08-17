/**
 * Client-safe environment variables. Expo only inlines vars prefixed with
 * `EXPO_PUBLIC_` into the bundle, so nothing here can be a real secret.
 * The Supabase anon key is designed to be public: real protection comes
 * from Row Level Security policies on the database, not from hiding this key.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: requireEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
};
