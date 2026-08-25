import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PetForm } from '../components/PetForm';
import type { Pet, PetDraft, SavePetResult } from '../types';
import { colors, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { formatWeight } from '../lib/globalization';
import { t } from '../lib/i18n';

export function PetsScreen({ pets, savingPet, onAddPet, onSelectPet }: { pets: Pet[]; savingPet: boolean; onAddPet: (draft: PetDraft) => Promise<SavePetResult>; onSelectPet: (pet: Pet) => void }) {
  const { language, unitSystem } = usePreferences();
  const [showPetForm, setShowPetForm] = useState(false);
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.title}>{t(language, 'Dostlarım')}</Text><Text style={styles.sub}>{t(language, 'Tüm sağlık bilgileri tek yerde.')}</Text></View>
        <Pressable accessibilityRole="button" onPress={() => setShowPetForm(value => !value)} style={[styles.headerButton, showPetForm && styles.headerButtonActive]}><Text style={[styles.headerButtonText, showPetForm && styles.headerButtonTextActive]}>{showPetForm ? t(language, 'Kapat') : `＋ ${t(language, 'Dost ekle')}`}</Text></Pressable>
      </View>
      {showPetForm ? <PetForm onSave={onAddPet} saving={savingPet} /> : null}
      {pets.length === 0 ? <Text style={styles.empty}>{t(language, 'Henüz bir dost eklenmemiş.')}</Text> : null}
      {pets.map((pet, index) => (
        <Pressable accessibilityRole="button" key={pet.id} onPress={() => onSelectPet(pet)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
          <View style={[styles.avatar, { backgroundColor: index ? '#FDE8DF' : colors.primarySoft }]}>{pet.photoUrl ? <Image source={{ uri: pet.photoUrl }} style={styles.photo} /> : <Text style={styles.emoji}>{pet.species === 'Kedi' ? '🐱' : pet.species === 'Köpek' ? '🐶' : '🐾'}</Text>}</View>
          <View style={styles.info}>
            <Text style={styles.name}>{pet.name}</Text>
            <Text style={styles.meta}>{pet.breed || t(language, pet.species)}{pet.weight > 0 ? ` • ${formatWeight(pet.weight, unitSystem, language)}` : ''}</Text>
            {pet.birthDate ? <Text style={styles.birth}>{t(language, 'Doğum')}: {new Date(`${pet.birthDate}T00:00:00`).toLocaleDateString(language)}</Text> : null}
          </View>
          <Text accessible={false} style={styles.arrow}>›</Text>
        </Pressable>
      ))}
      {!showPetForm ? <Pressable accessibilityRole="button" onPress={() => setShowPetForm(true)} style={styles.add}><Text style={styles.addText}>＋ {t(language, 'Yeni dost ekle')}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({ page: { padding: 22 }, header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, headerCopy: { flex: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, sub: { color: colors.muted, marginBottom: 22, marginTop: 5 }, headerButton: { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 }, headerButtonActive: { backgroundColor: colors.surface }, headerButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' }, headerButtonTextActive: { color: colors.primary }, empty: { color: colors.muted, marginBottom: 18, textAlign: 'center' }, card: { ...shadow, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, flexDirection: 'row', marginBottom: 14, padding: 16 }, cardPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] }, avatar: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 }, photo: { borderRadius: 28, height: 56, width: 56 }, emoji: { fontSize: 28 }, info: { flex: 1, marginLeft: 14 }, name: { color: colors.text, fontSize: 19, fontWeight: '800' }, meta: { color: colors.muted, marginTop: 4 }, birth: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 5 }, arrow: { color: colors.muted, fontSize: 30 }, add: { alignItems: 'center', borderColor: colors.primary, borderRadius: 18, borderStyle: 'dashed', borderWidth: 1.5, marginTop: 5, padding: 18 }, addText: { color: colors.primary, fontWeight: '800' } });