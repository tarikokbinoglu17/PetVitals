import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { addMonthsToIsoDate, toIsoDate, validateVaccineDraft } from '../lib/vaccineReminders';
import type { Pet, SaveVaccineResult, VaccineDraft } from '../types';
import { colors } from '../theme';

export function VaccineForm({
  pets,
  saving,
  onSave,
}: {
  pets: Pet[];
  saving: boolean;
  onSave: (draft: VaccineDraft) => Promise<SaveVaccineResult>;
}) {
  const today = toIsoDate(new Date());
  const [petId, setPetId] = useState(pets[0]?.id ?? '');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineType, setVaccineType] = useState('');
  const [administeredDate, setAdministeredDate] = useState(today);
  const [repeatInterval, setRepeatInterval] = useState('12');
  const [nextDueDate, setNextDueDate] = useState(addMonthsToIsoDate(today, 12));
  const [veterinarian, setVeterinarian] = useState('');
  const [notes, setNotes] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!pets.some(pet => pet.id === petId)) setPetId(pets[0]?.id ?? '');
  }, [petId, pets]);

  const updateAdministeredDate = (value: string) => {
    setAdministeredDate(value);
    const months = Number(repeatInterval);
    const calculated = addMonthsToIsoDate(value, months);
    if (calculated) setNextDueDate(calculated);
  };

  const updateRepeatInterval = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    setRepeatInterval(digits);
    const calculated = addMonthsToIsoDate(administeredDate, Number(digits));
    if (calculated) setNextDueDate(calculated);
  };

  const submit = async () => {
    setError('');
    setMessage('');

    const draft: VaccineDraft = {
      petId,
      vaccineName,
      vaccineType,
      administeredDate,
      nextDueDate,
      repeatIntervalMonths: repeatInterval ? Number(repeatInterval) : undefined,
      veterinarian,
      notes,
      notificationEnabled,
    };
    const validationError = validateVaccineDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const result = await onSave(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? 'Aşı kaydı başarıyla eklendi.');
      setVaccineName('');
      setVaccineType('');
      setVeterinarian('');
      setNotes('');
    } catch {
      setError('Aşı kaydı eklenirken beklenmeyen bir hata oluştu.');
    }
  };

  if (pets.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>Önce bir dost ekleyin</Text>
        <Text style={styles.help}>Aşı kaydı oluşturmak için Dostlarım bölümünde bir hayvan profili bulunmalı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.formTitle}>Yeni aşı kaydı</Text>
      <Text style={styles.label}>Dost seçin</Text>
      <View style={styles.petChoices}>
        {pets.map(pet => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: pet.id === petId }}
            key={pet.id}
            onPress={() => setPetId(pet.id)}
            style={[styles.petChoice, pet.id === petId && styles.petChoiceActive]}
          >
            <Text style={[styles.petChoiceText, pet.id === petId && styles.petChoiceTextActive]}>{pet.name}</Text>
          </Pressable>
        ))}
      </View>

      <FormField label="Aşı adı *" onChangeText={setVaccineName} placeholder="Örn. Karma aşı" value={vaccineName} />
      <FormField label="Aşı türü" onChangeText={setVaccineType} placeholder="Örn. DHPPi" value={vaccineType} />
      <FormField
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        label="Uygulama tarihi *"
        maxLength={10}
        onChangeText={updateAdministeredDate}
        placeholder="YYYY-AA-GG"
        value={administeredDate}
      />
      <FormField
        keyboardType="number-pad"
        label="Tekrar aralığı (ay)"
        maxLength={3}
        onChangeText={updateRepeatInterval}
        placeholder="12"
        value={repeatInterval}
      />
      <FormField
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        label="Sonraki aşı tarihi *"
        maxLength={10}
        onChangeText={setNextDueDate}
        placeholder="YYYY-AA-GG"
        value={nextDueDate}
      />
      <FormField label="Veteriner" onChangeText={setVeterinarian} placeholder="Veteriner veya klinik adı" value={veterinarian} />
      <FormField
        label="Notlar"
        multiline
        onChangeText={setNotes}
        placeholder="Doz, seri numarası veya özel not"
        textAlignVertical="top"
        value={notes}
      />

      <View style={styles.notificationRow}>
        <View style={styles.notificationCopy}>
          <Text style={styles.notificationTitle}>Otomatik hatırlatmalar</Text>
          <Text style={styles.help}>30, 7 ve 1 gün önce; ayrıca aşı günü saat 09.00’da.</Text>
        </View>
        <Switch
          accessibilityLabel="Aşı bildirimleri"
          onValueChange={setNotificationEnabled}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={notificationEnabled ? colors.primary : colors.muted}
          value={notificationEnabled}
        />
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
      <PrimaryButton loading={saving} onPress={submit} title="Aşı kaydını ekle" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 22, padding: 18 },
  formTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 18 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  petChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  petChoice: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  petChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  petChoiceText: { color: colors.text, fontWeight: '700' },
  petChoiceTextActive: { color: colors.white },
  notificationRow: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 14, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 14 },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: colors.text, fontWeight: '800' },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  success: { color: colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 12 },
});
