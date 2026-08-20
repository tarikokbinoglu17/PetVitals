import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [photo, setPhoto] = useState<PetDraft['photo']>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const pickPhoto = async () => {
    setError('');
    setMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Fotoğraf seçmek için galeri izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      exif: false,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      setError('Fotoğraf 10 MB’den küçük olmalı.');
      return;
    }

    setPhoto({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    });
  };

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
      photo,
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
      setPhoto(undefined);
    } catch {
      setError('Dostunuz eklenirken beklenmeyen bir hata oluştu.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Yeni dost profili</Text>
      <View style={styles.photoRow}>
        <View style={styles.photoPreview}>
          {photo ? (
            <Image accessibilityLabel="Seçilen dost fotoğrafı" source={{ uri: photo.uri }} style={styles.photo} />
          ) : (
            <Text style={styles.photoPlaceholder}>🐾</Text>
          )}
        </View>
        <View style={styles.photoCopy}>
          <Text style={styles.photoTitle}>Profil fotoğrafı</Text>
          <Text style={styles.photoHelp}>İsteğe bağlı • en fazla 10 MB</Text>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={pickPhoto}
            style={styles.photoButton}
          >
            <Text style={styles.photoButtonText}>{photo ? 'Fotoğrafı değiştir' : 'Galeriden seç'}</Text>
          </Pressable>
          {photo ? (
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => setPhoto(undefined)}>
              <Text style={styles.removePhoto}>Fotoğrafı kaldır</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
  photoRow: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, flexDirection: 'row', gap: 14, marginBottom: 18, padding: 14 },
  photoPreview: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 36, height: 72, justifyContent: 'center', overflow: 'hidden', width: 72 },
  photo: { height: '100%', width: '100%' },
  photoPlaceholder: { fontSize: 30 },
  photoCopy: { flex: 1 },
  photoTitle: { color: colors.text, fontWeight: '800' },
  photoHelp: { color: colors.muted, fontSize: 11, marginTop: 3 },
  photoButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 10, marginTop: 9, paddingHorizontal: 11, paddingVertical: 7 },
  photoButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  removePhoto: { color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  choice: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontWeight: '700' },
  choiceTextActive: { color: colors.white },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  success: { color: colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 12 },
});
