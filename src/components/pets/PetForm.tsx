import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { TextField } from '@/components/ui/TextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePetInput, PetGender, PetSpecies } from '@/types/pet';
import { isPositiveNumber, isValidIsoDate } from '@/utils/validation';

const SPECIES_OPTIONS: PetSpecies[] = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'rodent',
  'reptile',
  'fish',
  'horse',
  'other',
];
const GENDER_OPTIONS: PetGender[] = ['male', 'female', 'unknown'];

interface PetFormProps {
  initialValues?: Partial<CreatePetInput>;
  submitLabel: string;
  onSubmit: (input: CreatePetInput) => Promise<void>;
}

export function PetForm({ initialValues, submitLabel, onSubmit }: PetFormProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [name, setName] = useState(initialValues?.name ?? '');
  const [species, setSpecies] = useState<PetSpecies>(initialValues?.species ?? 'dog');
  const [breed, setBreed] = useState(initialValues?.breed ?? '');
  const [gender, setGender] = useState<PetGender>(initialValues?.gender ?? 'unknown');
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth ?? '');
  const [weightKg, setWeightKg] = useState(
    initialValues?.weightKg != null ? String(initialValues.weightKg) : '',
  );
  const [microchipId, setMicrochipId] = useState(initialValues?.microchipId ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) {
      setErrorMessage(t('pets.form.errors.nameRequired'));
      return;
    }
    if (dateOfBirth.trim() && !isValidIsoDate(dateOfBirth.trim())) {
      setErrorMessage(t('pets.form.errors.invalidDate'));
      return;
    }
    if (weightKg.trim() && !isPositiveNumber(weightKg.trim())) {
      setErrorMessage(t('pets.form.errors.invalidWeight'));
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        gender,
        dateOfBirth: dateOfBirth.trim() || null,
        weightKg: weightKg.trim() ? Number(weightKg.trim()) : null,
        microchipId: microchipId.trim() || null,
        photoUrl: initialValues?.photoUrl ?? null,
        description: description.trim() || null,
      });
    } catch {
      setErrorMessage(t('common.errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField label={t('pets.form.nameLabel')} value={name} onChangeText={setName} />

      <ChipSelector
        label={t('pets.form.speciesLabel')}
        value={species}
        onChange={setSpecies}
        options={SPECIES_OPTIONS.map((option) => ({
          value: option,
          label: t(`species.${option}`),
        }))}
      />

      <TextField label={t('pets.form.breedLabel')} value={breed} onChangeText={setBreed} />

      <ChipSelector
        label={t('pets.form.genderLabel')}
        value={gender}
        onChange={setGender}
        options={GENDER_OPTIONS.map((option) => ({ value: option, label: t(`genders.${option}`) }))}
      />

      <TextField
        label={t('pets.form.dateOfBirthLabel')}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      <TextField
        label={t('pets.form.weightLabel')}
        value={weightKg}
        onChangeText={setWeightKg}
        keyboardType="decimal-pad"
      />

      <TextField
        label={t('pets.form.microchipLabel')}
        value={microchipId}
        onChangeText={setMicrochipId}
        autoCapitalize="characters"
      />

      <TextField
        label={t('pets.form.descriptionLabel')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />

      {errorMessage ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <Button label={submitLabel} onPress={handleSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  multiline: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  errorText: { fontSize: 13 },
});
