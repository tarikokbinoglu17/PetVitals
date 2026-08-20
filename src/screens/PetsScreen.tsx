import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PetForm } from '../components/PetForm';
import type { Pet, PetDraft, SavePetResult } from '../types';
import { colors, shadow } from '../theme';

export function PetsScreen({
  pets,
  savingPet,
  onAddPet,
}: {
  pets: Pet[];
  savingPet: boolean;
  onAddPet: (draft: PetDraft) => Promise<SavePetResult>;
}) {
  const [showPetForm, setShowPetForm] = useState(false);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Dostlarım</Text>
          <Text style={styles.sub}>Tüm sağlık bilgileri tek yerde.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPetForm(value => !value)}
          style={[styles.headerButton, showPetForm && styles.headerButtonActive]}
        >
          <Text style={[styles.headerButtonText, showPetForm && styles.headerButtonTextActive]}>
            {showPetForm ? 'Kapat' : '＋ Dost ekle'}
          </Text>
        </Pressable>
      </View>
      {showPetForm ? <PetForm onSave={onAddPet} saving={savingPet} /> : null}
      {pets.length === 0 ? <Text style={styles.empty}>Henüz bir dost eklenmemiş.</Text> : null}
      {pets.map((pet, index) => (
        <View key={pet.id} style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: index ? '#FDE8DF' : colors.primarySoft }]}>
            {pet.photoUrl ? (
              <Image accessibilityLabel={`${pet.name} profil fotoğrafı`} source={{ uri: pet.photoUrl }} style={styles.photo} />
            ) : (
              <Text style={styles.emoji}>{pet.species === 'Kedi' ? '🐱' : pet.species === 'Köpek' ? '🐶' : '🐾'}</Text>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{pet.name}</Text>
            <Text style={styles.meta}>
              {pet.breed || pet.species}{pet.weight > 0 ? ` • ${pet.weight} kg` : ''}
            </Text>
            {pet.birthDate ? <Text style={styles.birth}>Doğum: {new Date(`${pet.birthDate}T00:00:00`).toLocaleDateString('tr-TR')}</Text> : null}
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
      ))}
      {!showPetForm ? (
        <Pressable accessibilityRole="button" onPress={() => setShowPetForm(true)} style={styles.add}>
          <Text style={styles.addText}>＋ Yeni dost ekle</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  sub: { color: colors.muted, marginBottom: 22, marginTop: 5 },
  headerButton: { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  headerButtonActive: { backgroundColor: colors.surface },
  headerButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  headerButtonTextActive: { color: colors.primary },
  empty: { color: colors.muted, marginBottom: 18, textAlign: 'center' },
  card: { ...shadow, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, flexDirection: 'row', marginBottom: 14, padding: 16 },
  avatar: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  photo: { borderRadius: 28, height: 56, width: 56 },
  emoji: { fontSize: 28 },
  info: { flex: 1, marginLeft: 14 },
  name: { color: colors.text, fontSize: 19, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: 4 },
  birth: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 5 },
  arrow: { color: colors.muted, fontSize: 30 },
  add: { alignItems: 'center', borderColor: colors.primary, borderRadius: 18, borderStyle: 'dashed', borderWidth: 1.5, marginTop: 5, padding: 18 },
  addText: { color: colors.primary, fontWeight: '800' },
});
