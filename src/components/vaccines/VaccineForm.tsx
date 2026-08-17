import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { TextField } from '@/components/ui/TextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreateVaccineInput, VaccineType } from '@/types/vaccine';
import { isPositiveNumber, isValidIsoDate } from '@/utils/validation';

const VACCINE_TYPE_OPTIONS: VaccineType[] = ['core', 'non_core', 'other'];

interface VaccineFormProps {
  petId: string;
  initialValues?: Partial<CreateVaccineInput>;
  submitLabel: string;
  onSubmit: (input: CreateVaccineInput) => Promise<void>;
}

export function VaccineForm({ petId, initialValues, submitLabel, onSubmit }: VaccineFormProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [vaccineName, setVaccineName] = useState(initialValues?.vaccineName ?? '');
  const [vaccineType, setVaccineType] = useState<VaccineType>(initialValues?.vaccineType ?? 'core');
  const [administeredDate, setAdministeredDate] = useState(initialValues?.administeredDate ?? '');
  const [nextDueDate, setNextDueDate] = useState(initialValues?.nextDueDate ?? '');
  const [repeatIntervalDays, setRepeatIntervalDays] = useState(
    initialValues?.repeatIntervalDays != null ? String(initialValues.repeatIntervalDays) : '',
  );
  const [veterinarian, setVeterinarian] = useState(initialValues?.veterinarian ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [notificationEnabled, setNotificationEnabled] = useState(
    initialValues?.notificationEnabled ?? true,
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!vaccineName.trim()) {
      setErrorMessage(t('vaccines.form.errors.nameRequired'));
      return;
    }
    if (!isValidIsoDate(administeredDate.trim())) {
      setErrorMessage(t('vaccines.form.errors.invalidAdministeredDate'));
      return;
    }
    if (nextDueDate.trim() && !isValidIsoDate(nextDueDate.trim())) {
      setErrorMessage(t('vaccines.form.errors.invalidNextDueDate'));
      return;
    }
    if (repeatIntervalDays.trim() && !isPositiveNumber(repeatIntervalDays.trim())) {
      setErrorMessage(t('vaccines.form.errors.invalidRepeatInterval'));
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await onSubmit({
        petId,
        vaccineName: vaccineName.trim(),
        vaccineType,
        administeredDate: administeredDate.trim(),
        nextDueDate: nextDueDate.trim() || null,
        repeatIntervalDays: repeatIntervalDays.trim() ? Number(repeatIntervalDays.trim()) : null,
        veterinarian: veterinarian.trim() || null,
        notes: notes.trim() || null,
        attachmentUrl: initialValues?.attachmentUrl ?? null,
        notificationEnabled,
      });
    } catch {
      setErrorMessage(t('common.errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField
        label={t('vaccines.form.nameLabel')}
        value={vaccineName}
        onChangeText={setVaccineName}
      />

      <ChipSelector
        label={t('vaccines.form.typeLabel')}
        value={vaccineType}
        onChange={setVaccineType}
        options={VACCINE_TYPE_OPTIONS.map((option) => ({
          value: option,
          label: t(`vaccineTypes.${option}`),
        }))}
      />

      <TextField
        label={t('vaccines.form.administeredDateLabel')}
        value={administeredDate}
        onChangeText={setAdministeredDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      <TextField
        label={t('vaccines.form.nextDueDateLabel')}
        value={nextDueDate}
        onChangeText={setNextDueDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      <TextField
        label={t('vaccines.form.repeatIntervalLabel')}
        value={repeatIntervalDays}
        onChangeText={setRepeatIntervalDays}
        keyboardType="number-pad"
        placeholder={t('vaccines.form.repeatIntervalPlaceholder')}
      />

      <TextField
        label={t('vaccines.form.veterinarianLabel')}
        value={veterinarian}
        onChangeText={setVeterinarian}
      />

      <TextField
        label={t('vaccines.form.notesLabel')}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />

      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>
          {t('vaccines.form.remindersLabel')}
        </Text>
        <Switch
          value={notificationEnabled}
          onValueChange={setNotificationEnabled}
          trackColor={{ true: colors.primary }}
        />
      </View>

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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 15, fontWeight: '500' },
});
