import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingView />;
  }

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
