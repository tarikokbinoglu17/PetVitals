import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PetForm } from '@/components/pets/PetForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { getPet, updatePet } from '@/services/supabase/pet.service';
import type { CreatePetInput, Pet } from '@/types/pet';
import { getErrorMessage } from '@/utils/errors';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setPet(await getPet(id));
    } catch (err) {
      console.error('getPet failed:', getErrorMessage(err));
      setError(t('common.errors.loadFailed'));
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleSubmit(input: CreatePetInput) {
    if (!id) return;
    await updatePet(id, input);
    router.back();
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={load} />
      </ScreenContainer>
    );
  }

  if (!pet) {
    return <LoadingView label={t('common.loading')} />;
  }

  return (
    <ScreenContainer scrollable>
      <PetForm initialValues={pet} submitLabel={t('common.save')} onSubmit={handleSubmit} />
    </ScreenContainer>
  );
}
