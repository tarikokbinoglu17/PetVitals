import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { validatePetDraft } from '../lib/pets';
import { colors } from '../theme';
import type { Pet, PetDraft, SavePetResult } from '../types';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

const speciesOptions: Pet['species'][] = ['Kedi', 'Köpek', 'Diğer'];

export function PetForm({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: (draft: PetDraft) => Promise<SavePetResult>;
}) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Pet['species']>('Kedi');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    setError('');
    setMessage('');

    const normalizedWeight = weight.trim() ? Number(weight.replace(',', '.')) : undefined;
    const draft: PetDraft = {
      name,
      species,
      breed,
      birthDate: birthDate.trim() || undefined,
      weight: normalizedWeight,
    };
    const validationError = validatePetDraft(draft);
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
      setMessage(result.message ?? 'Dostunuz başarıyla eklendi.');
      setName('');
      setBreed('');
      setBirthDate('');
      setWeight('');
    } catch {
      setError('Dostunuz eklenirken beklenmeyen bir hata oluştu.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Yeni dost profili</Text>
      <Text style={styles.label}>Tür *</Text>
      <View style={styles.choices}>
        {speciesOptions.map(option => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: species === option }}
            key={option}
            onPress={() => setSpecies(option)}
            style={[styles.choice, species === option && styles.choiceActive]}
          >
            <Text style={[styles.choiceText, species === option && styles.choiceTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <FormField label="Adı *" onChangeText={setName} placeholder="Örn. Moka" value={name} />
      <FormField label="Irkı" onChangeText={setBreed} placeholder="Örn. Golden Retriever" value={breed} />
      <FormField
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        label="Doğum tarihi"
        maxLength={10}
        onChangeText={setBirthDate}
        placeholder="YYYY-AA-GG"
        value={birthDate}
      />
      <FormField
        keyboardType="decimal-pad"
        label="Ağırlık (kg)"
        maxLength={6}
        onChangeText={value => setWeight(value.replace(/[^0-9,.]/g, ''))}
        placeholder="Örn. 4,6"
        value={weight}
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
      <PrimaryButton loading={saving} onPress={submit} title="Dostumu ekle" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 20, padding: 18 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 18 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  choice: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontWeight: '700' },
  choiceTextActive: { color: colors.white },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  success: { color: colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 12 },
});
