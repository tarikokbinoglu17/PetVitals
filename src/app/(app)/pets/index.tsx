import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { listMyPets } from '@/services/supabase/pet.service';
import type { Pet } from '@/types/pet';
import { getErrorMessage } from '@/utils/errors';

export default function PetsListScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const data = await listMyPets(user.id);
      setPets(data);
    } catch (err) {
      console.error('listMyPets failed:', getErrorMessage(err));
      setError(t('common.errors.loadFailed'));
    }
  }, [user, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={load} />
      </ScreenContainer>
    );
  }

  if (pets === null) {
    return <LoadingView label={t('common.loading')} />;
  }

  if (pets.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          message={t('pets.empty')}
          actionLabel={t('pets.addPet')}
          onAction={() => router.push('/pets/new')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/pets/${item.id}`)}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            <Text style={{ color: colors.textMuted }}>{t(`species.${item.species}`)}</Text>
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable onPress={() => router.push('/pets/new')} style={styles.addRow}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('pets.addPet')}</Text>
          </Pressable>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  row: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 4 },
  name: { fontSize: 17, fontWeight: '600' },
  addRow: { alignItems: 'center', paddingVertical: 20 },
});
