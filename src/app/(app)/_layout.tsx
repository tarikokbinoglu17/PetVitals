import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function AppLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingView />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('navigation.home') }} />
      <Tabs.Screen name="pets" options={{ title: t('navigation.pets') }} />
      <Tabs.Screen name="profile" options={{ title: t('navigation.profile') }} />
    </Tabs>
  );
}
