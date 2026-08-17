import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PetForm } from '@/components/pets/PetForm';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/hooks/useAuth';
import { createPet } from '@/services/supabase/pet.service';
import type { CreatePetInput } from '@/types/pet';

export default function NewPetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  async function handleSubmit(input: CreatePetInput) {
    if (!user) return;
    const pet = await createPet(user.id, input);
    router.replace(`/pets/${pet.id}`);
  }

  return (
    <ScreenContainer scrollable>
      <PetForm submitLabel={t('common.save')} onSubmit={handleSubmit} />
    </ScreenContainer>
  );
}
