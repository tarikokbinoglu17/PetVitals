import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { evaluateSmartHealthAlerts, type SmartHealthAlert } from '../lib/healthBrain';
import { buildTodayLifeMetrics } from '../lib/lifeDashboard';
import { addLifeEntry, loadPlatformSnapshot, type PetLifeEntryType, type PlatformSnapshot } from '../lib/platformData';
import type { Pet } from '../types';
import { colors, shadow } from '../theme';

const emptySnapshot: PlatformSnapshot = { weights: [], lifeEntries: [], memberCount: 0, activePassportCount: 0, passports: [], pro: { plan: 'free' } };
const quickTypes: { key: PetLifeEntryType; label: string; placeholder: string; unit: string }[] = [
  { key: 'food', label: 'Mama', placeholder: 'Örn. 120', unit: 'g' },
  { key: 'water', label: 'Su', placeholder: 'Örn. 250', unit: 'ml' },
  { key: 'activity', label: 'Aktivite', placeholder: 'Örn. 45', unit: 'dk' },
  { key: 'sleep', label: 'Uyku', placeholder: 'Örn. 8', unit: 'saat' },
  { key: 'grooming', label: 'Bakım', placeholder: 'Not', unit: '' },
  { key: 'parasite', label: 'Parazit', placeholder: 'Uygulama adı/not', unit: '' },
  { key: 'mood', label: 'Ruh hali', placeholder: 'Mutlu, sakin...', unit: '' },
];

export function LifeScreen({ pets, userId, demoMode }: { pets: Pet[]; userId?: string; demoMode: boolean }) {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? '');
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>(emptySnapshot);
  const [alerts, setAlerts] = useState<SmartHealthAlert[]>([]);
  const [selectedType, setSelectedType] = useState<PetLifeEntryType>('activity');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('dk');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedPet = pets.find(pet => pet.id === selectedPetId) ?? pets[0];
  const metrics = useMemo(() => buildTodayLifeMetrics(snapshot.lifeEntries), [snapshot.lifeEntries]);

  useEffect(() => {
    if (!pets.some(pet => pet.id === selectedPetId)) setSelectedPetId(pets[0]?.id ?? '');
  }, [pets, selectedPetId]);

  async function refresh() {
    if (!selectedPet || !userId || demoMode) {
      setSnapshot(emptySnapshot);
      setAlerts([]);
      return;
    }
    setLoading(true);
    try {
      const [nextSnapshot, nextAlerts] = await Promise.all([
        loadPlatformSnapshot(userId, selectedPet.id),
        evaluateSmartHealthAlerts(selectedPet.id),
      ]);
      setSnapshot(nextSnapshot);
      setAlerts(nextAlerts);
    } catch {
      // Dashboard remains usable even if alert evaluation is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [selectedPet?.id, userId, demoMode]);

  function chooseType(type: PetLifeEntryType) {
    setSelectedType(type);
    const preset = quickTypes.find(item => item.key === type);
    setUnit(preset?.unit ?? '');
    setValue('');
    setNote('');
  }

  async function save() {
    if (!selectedPet || !userId || demoMode) {
      Alert.alert('Gerçek hesap gerekli', 'Life kayıtları gerçek hesabınızda saklanır.');
      return;
    }
    const numeric = value.trim() ? Number(value.replace(',', '.')) : undefined;
    setSaving(true);
    try {
      await addLifeEntry(userId, selectedPet.id, {
        entryType: selectedType,
        valueNumeric: Number.isFinite(numeric) ? numeric : undefined,
        valueText: Number.isFinite(numeric) ? undefined : value.trim() || undefined,
        unit,
        notes: note,
      });
      setValue('');
      setNote('');
      await refresh();
    } catch (error) {
      Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'Life kaydı eklenemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PETVITALS LIFE</Text>
      <Text style={styles.title}>Bugün nasıl gidiyor?</Text>
      <Text style={styles.sub}>Beslenme, su, aktivite, uyku ve bakım rutinlerini tek yerde takip edin.</Text>

      {pets.length > 1 ? <View style={styles.petPicker}>{pets.map(pet => <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.petChip, selectedPet?.id === pet.id && styles.petChipActive]}><Text style={[styles.petChipText, selectedPet?.id === pet.id && styles.petChipTextActive]}>{pet.name}</Text></Pressable>)}</View> : null}

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} /> : null}

      <Text style={styles.section}>Bugünün özeti</Text>
      <View style={styles.grid}>{metrics.filter(metric => metric.type !== 'custom').map(metric => <View key={metric.type} style={styles.metricCard}><Text style={styles.metricIcon}>{metric.icon}</Text><Text style={styles.metricLabel}>{metric.label}</Text><Text style={styles.metricValue}>{metric.total != null ? `${Number(metric.total.toFixed(1))}${metric.unit ? ` ${metric.unit}` : ''}` : metric.latestText || '—'}</Text><Text style={styles.metricCount}>{metric.count ? `${metric.count} kayıt` : 'Henüz kayıt yok'}</Text></View>)}</View>

      <Text style={styles.section}>Hızlı kayıt</Text>
      <View style={styles.chips}>{quickTypes.map(item => <Pressable key={item.key} onPress={() => chooseType(item.key)} style={[styles.chip, selectedType === item.key && styles.chipActive]}><Text style={[styles.chipText, selectedType === item.key && styles.chipTextActive]}>{item.label}</Text></Pressable>)}</View>
      <View style={styles.formCard}>
        <TextInput keyboardType={['food','water','activity','sleep'].includes(selectedType) ? 'decimal-pad' : 'default'} placeholder={quickTypes.find(item => item.key === selectedType)?.placeholder} placeholderTextColor={colors.muted} value={value} onChangeText={setValue} style={styles.input} />
        <TextInput placeholder="Birim" placeholderTextColor={colors.muted} value={unit} onChangeText={setUnit} style={styles.input} />
        <TextInput multiline placeholder="Not (opsiyonel)" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} style={[styles.input, styles.multiline]} />
        <Pressable disabled={saving} onPress={save} style={styles.saveButton}><Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor…' : 'Bugüne ekle'}</Text></Pressable>
      </View>

      <Text style={styles.section}>Akıllı sağlık uyarıları</Text>
      {alerts.length === 0 ? <View style={styles.okCard}><Text style={styles.okTitle}>✓ Aktif uyarı yok</Text><Text style={styles.okText}>PetVitals kayıtları açılışta ve yeni Life kaydı sonrasında otomatik kontrol eder.</Text></View> : alerts.map(alert => <View key={alert.id} style={styles.alertCard}><Text style={styles.alertSeverity}>{alert.severity.toUpperCase()}</Text><Text style={styles.alertTitle}>{alert.title}</Text><Text style={styles.alertText}>{alert.message}</Text></View>)}

      <Text style={styles.disclaimer}>Smart Alerts kayıtlarınızdaki değişimleri ve kayıt boşluklarını görünür hale getirir; veteriner tanısı değildir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 6 },
  sub: { color: colors.muted, lineHeight: 20, marginTop: 7 },
  petPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  petChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  petChipActive: { backgroundColor: colors.primary },
  petChipText: { color: colors.text, fontWeight: '700' },
  petChipTextActive: { color: colors.white },
  section: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 11, marginTop: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, padding: 14, width: '48%' },
  metricIcon: { fontSize: 20 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 7 },
  metricValue: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  metricCount: { color: colors.muted, fontSize: 10, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  chipTextActive: { color: colors.white },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 14 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, marginBottom: 9, paddingHorizontal: 12, paddingVertical: 11 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 12 },
  saveButtonText: { color: colors.white, fontWeight: '900' },
  okCard: { backgroundColor: '#EEF7F4', borderRadius: 16, padding: 15 },
  okTitle: { color: colors.primaryDark, fontWeight: '900' },
  okText: { color: colors.muted, lineHeight: 18, marginTop: 5 },
  alertCard: { backgroundColor: '#FFF7ED', borderRadius: 16, marginBottom: 9, padding: 15 },
  alertSeverity: { color: colors.accent, fontSize: 10, fontWeight: '900' },
  alertTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 3 },
  alertText: { color: colors.muted, lineHeight: 18, marginTop: 4 },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 16 },
});
