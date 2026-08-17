import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { deletePet, getPet } from '@/services/supabase/pet.service';
import { listVaccinesForPet } from '@/services/supabase/vaccine.service';
import type { Pet } from '@/types/pet';
import type { VaccineRecord } from '@/types/vaccine';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccines, setVaccines] = useState<VaccineRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [petData, vaccineData] = await Promise.all([getPet(id), listVaccinesForPet(id)]);
      setPet(petData);
      setVaccines(vaccineData);
    } catch (err) {
      console.error('load pet detail failed:', getErrorMessage(err));
      setError(t('common.errors.loadFailed'));
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function handleDelete() {
    if (!pet) return;
    Alert.alert(t('pets.deleteConfirmTitle'), t('pets.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deletePet(pet.id);
              router.back();
            } catch (err) {
              console.error('deletePet failed:', getErrorMessage(err));
              Alert.alert(t('common.errors.deleteFailed'));
            }
          })();
        },
      },
    ]);
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={load} />
      </ScreenContainer>
    );
  }

  if (!pet || vaccines === null) {
    return <LoadingView label={t('common.loading')} />;
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{pet.name}</Text>
        <Text style={{ color: colors.textMuted }}>
          {t(`species.${pet.species}`)}
          {pet.breed ? ` · ${pet.breed}` : ''}
        </Text>
        {pet.dateOfBirth ? (
          <Text style={{ color: colors.textMuted }}>
            {t('pets.detail.bornOn', { date: formatDate(pet.dateOfBirth, i18n.language) })}
          </Text>
        ) : null}
        {pet.weightKg != null ? (
          <Text style={{ color: colors.textMuted }}>
            {t('pets.detail.weight', { weight: pet.weightKg })}
          </Text>
        ) : null}
        {pet.description ? (
          <Text style={[styles.description, { color: colors.text }]}>{pet.description}</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <Button
            label={t('common.edit')}
            variant="secondary"
            onPress={() => router.push(`/pets/${pet.id}/edit`)}
          />
          <Button label={t('common.delete')} variant="secondary" onPress={handleDelete} />
        </View>
      </View>

      <View style={styles.vaccinesHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('vaccines.title')}</Text>
        <Pressable onPress={() => router.push(`/pets/${pet.id}/vaccines/new`)}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {t('vaccines.addVaccine')}
          </Text>
        </Pressable>
      </View>

      {vaccines.length === 0 ? (
        <EmptyState message={t('vaccines.empty')} />
      ) : (
        <FlatList
          data={vaccines}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.vaccineList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/pets/${pet.id}/vaccines/${item.id}`)}
              style={[
                styles.vaccineRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.vaccineName, { color: colors.text }]}>{item.vaccineName}</Text>
              <Text style={{ color: colors.textMuted }}>
                {formatDate(item.administeredDate, i18n.language)}
              </Text>
              {item.nextDueDate ? (
                <Text style={{ color: colors.textMuted }}>
                  {t('vaccines.nextDue', { date: formatDate(item.nextDueDate, i18n.language) })}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, gap: 6 },
  name: { fontSize: 26, fontWeight: '700' },
  description: { fontSize: 15, marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  vaccinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  vaccineList: { padding: 20, gap: 12 },
  vaccineRow: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  vaccineName: { fontSize: 16, fontWeight: '600' },
});
