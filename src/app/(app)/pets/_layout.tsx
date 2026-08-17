import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function PetsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: t('pets.title') }} />
      <Stack.Screen name="new" options={{ title: t('pets.addPet') }} />
      <Stack.Screen name="[id]/index" options={{ title: t('pets.detailTitle') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('pets.editTitle') }} />
      <Stack.Screen name="[id]/vaccines/new" options={{ title: t('vaccines.addVaccine') }} />
      <Stack.Screen name="[id]/vaccines/[vaccineId]" options={{ title: t('vaccines.editTitle') }} />
    </Stack>
  );
}
