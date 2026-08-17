import { useAuthStore } from '@/store/authStore';

/** Ergonomic selector hook for auth state and actions; the store itself owns the logic. */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);

  return {
    status,
    session,
    user,
    error,
    isAuthenticated: status === 'authenticated',
    isBootstrapping: status === 'idle' || status === 'loading',
    signIn,
    signUp,
    signOut,
  };
}
