import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { VaccineForm } from '@/components/vaccines/VaccineForm';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { syncVaccineReminders } from '@/services/supabase/reminder.service';
import { createVaccine } from '@/services/supabase/vaccine.service';
import type { CreateVaccineInput } from '@/types/vaccine';
import { getErrorMessage } from '@/utils/errors';

export default function NewVaccineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  async function handleSubmit(input: CreateVaccineInput) {
    const vaccine = await createVaccine(input);
    try {
      await syncVaccineReminders(vaccine.id, vaccine.nextDueDate, vaccine.notificationEnabled);
    } catch (err) {
      // The vaccine record itself is already saved; reminder sync is best-effort.
      console.error('syncVaccineReminders failed:', getErrorMessage(err));
    }
    router.back();
  }

  if (!id) return null;

  return (
    <ScreenContainer scrollable>
      <VaccineForm petId={id} submitLabel={t('common.save')} onSubmit={handleSubmit} />
    </ScreenContainer>
  );
}
