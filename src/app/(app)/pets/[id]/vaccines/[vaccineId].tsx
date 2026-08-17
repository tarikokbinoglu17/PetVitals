import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { VaccineForm } from '@/components/vaccines/VaccineForm';
import { syncVaccineReminders } from '@/services/supabase/reminder.service';
import { deleteVaccine, getVaccine, updateVaccine } from '@/services/supabase/vaccine.service';
import type { CreateVaccineInput, VaccineRecord } from '@/types/vaccine';
import { getErrorMessage } from '@/utils/errors';

export default function EditVaccineScreen() {
  const { id, vaccineId } = useLocalSearchParams<{ id: string; vaccineId: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const [vaccine, setVaccine] = useState<VaccineRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaccineId) return;
    setError(null);
    try {
      setVaccine(await getVaccine(vaccineId));
    } catch (err) {
      console.error('getVaccine failed:', getErrorMessage(err));
      setError(t('common.errors.loadFailed'));
    }
  }, [vaccineId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleSubmit(input: CreateVaccineInput) {
    if (!vaccineId) return;
    const updated = await updateVaccine(vaccineId, input);
    try {
      await syncVaccineReminders(updated.id, updated.nextDueDate, updated.notificationEnabled);
    } catch (err) {
      console.error('syncVaccineReminders failed:', getErrorMessage(err));
    }
    router.back();
  }

  function handleDelete() {
    if (!vaccineId) return;
    Alert.alert(t('vaccines.deleteConfirmTitle'), t('vaccines.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteVaccine(vaccineId);
              router.back();
            } catch (err) {
              console.error('deleteVaccine failed:', getErrorMessage(err));
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

  if (!vaccine || !id) {
    return <LoadingView label={t('common.loading')} />;
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.content}>
        <VaccineForm
          petId={id}
          initialValues={vaccine}
          submitLabel={t('common.save')}
          onSubmit={handleSubmit}
        />
        <Button label={t('common.delete')} variant="secondary" onPress={handleDelete} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
});
