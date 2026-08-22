import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { AIAssistantPanel } from '../components/AIAssistantPanel';
import { DocumentScannerPanel } from '../components/DocumentScannerPanel';
import { ProPaywall } from '../components/ProPaywall';
import { calculateHealthScore } from '../lib/healthScore';
import {
  addLifeEntry,
  addWeightEntry,
  createPassportShare,
  invitePetMember,
  loadPlatformSnapshot,
  revokePassportShare,
  setPassportLostMode,
  type PetLifeEntryType,
  type PlatformSnapshot,
} from '../lib/platformData';
import type { HealthRecord, Pet, PetMemberRole } from '../types';
import { colors, shadow } from '../theme';

type FeatureCardProps = {
  icon: string;
  title: string;
  text: string;
  badge?: string;
  status?: string;
  onPress?: () => void;
};

function FeatureCard({ icon, title, text, badge, status, onPress }: FeatureCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardIcon}><Text style={styles.cardIconText}>{icon}</Text></View>
      <View style={styles.cardCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.cardText}>{text}</Text>
        {status ? <Text style={styles.cardStatus}>{status}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const emptySnapshot: PlatformSnapshot = {
  weights: [],
  lifeEntries: [],
  memberCount: 0,
  activePassportCount: 0,
  passports: [],
  pro: { plan: 'free' },
};

type ToolPanel = 'assistant' | 'scanner' | null;
type ActionPanel = 'weight' | 'life' | 'member' | 'passport' | null;

const lifeTypes: { key: PetLifeEntryType; label: string }[] = [
  { key: 'food', label: 'Mama' },
  { key: 'water', label: 'Su' },
  { key: 'activity', label: 'Aktivite' },
  { key: 'sleep', label: 'Uyku' },
  { key: 'grooming', label: 'Bakım' },
  { key: 'parasite', label: 'Parazit' },
  { key: 'mood', label: 'Ruh hali' },
  { key: 'custom', label: 'Diğer' },
];

export function PlatformScreen({ pets, records, userId, demoMode }: { pets: Pet[]; records: HealthRecord[]; userId?: string; demoMode: boolean }) {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id);
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null);
  const [weightValue, setWeightValue] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<PetMemberRole>('caregiver');
  const [lifeType, setLifeType] = useState<PetLifeEntryType>('activity');
  const [lifeValue, setLifeValue] = useState('');
  const [lifeUnit, setLifeUnit] = useState('');
  const [lifeNotes, setLifeNotes] = useState('');

  const selectedPet = pets.find(pet => pet.id === selectedPetId) ?? pets[0];
  const score = useMemo(() => selectedPet ? calculateHealthScore(selectedPet, records, snapshot.weights) : null, [records, selectedPet, snapshot.weights]);

  async function refresh() {
    if (!selectedPet || !userId || demoMode) {
      setSnapshot(emptySnapshot);
      return;
    }
    setLoading(true);
    try {
      setSnapshot(await loadPlatformSnapshot(userId, selectedPet.id));
      setLoadError(null);
    } catch {
      setLoadError('PetVitals+ verileri şu anda yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setToolPanel(null);
    setActionPanel(null);
    void refresh();
  }, [demoMode, selectedPet?.id, userId]);

  const lastWeight = snapshot.weights.at(-1);
  const previousWeight = snapshot.weights.at(-2);
  const weightTrend = lastWeight && previousWeight
    ? `${lastWeight.weight > previousWeight.weight ? '↑' : lastWeight.weight < previousWeight.weight ? '↓' : '→'} ${lastWeight.weight.toFixed(1)} kg`
    : lastWeight ? `${lastWeight.weight.toFixed(1)} kg` : 'Henüz kilo geçmişi yok';
  const proActive = snapshot.pro.plan === 'pro';

  const openProTool = (panel: Exclude<ToolPanel, null>) => {
    if (!proActive) {
      setShowPaywall(true);
      return;
    }
    setShowPaywall(false);
    setToolPanel(panel);
    setActionPanel(null);
  };

  function requireLiveAccount() {
    if (!userId || demoMode || !selectedPet) {
      Alert.alert('Gerçek hesap gerekli', 'Bu işlem demo modunda kullanılamaz.');
      return false;
    }
    return true;
  }

  async function saveWeight() {
    if (!requireLiveAccount() || !selectedPet || !userId) return;
    const value = Number(weightValue.replace(',', '.'));
    setBusy(true);
    try {
      await addWeightEntry(userId, selectedPet.id, value);
      setWeightValue('');
      await refresh();
      Alert.alert('Kaydedildi', 'Kilo kaydı Health Score ve trendlere eklendi.');
    } catch (error) {
      Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'Kilo kaydı eklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function saveLifeEntry() {
    if (!requireLiveAccount() || !selectedPet || !userId) return;
    const numeric = lifeValue.trim() ? Number(lifeValue.replace(',', '.')) : undefined;
    setBusy(true);
    try {
      await addLifeEntry(userId, selectedPet.id, {
        entryType: lifeType,
        valueNumeric: Number.isFinite(numeric) ? numeric : undefined,
        valueText: !Number.isFinite(numeric) ? lifeValue : undefined,
        unit: lifeUnit,
        notes: lifeNotes,
      });
      setLifeValue('');
      setLifeUnit('');
      setLifeNotes('');
      await refresh();
      Alert.alert('Kaydedildi', 'Günlük yaşam kaydı PetVitals Health Brain hafızasına eklendi.');
    } catch (error) {
      Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'Yaşam kaydı eklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function saveMember() {
    if (!requireLiveAccount() || !selectedPet || !userId) return;
    setBusy(true);
    try {
      await invitePetMember(userId, selectedPet.id, memberEmail, memberRole);
      setMemberEmail('');
      await refresh();
      Alert.alert('Erişim hazırlandı', 'Davet PetVitals bakım ağına kaydedildi.');
    } catch (error) {
      Alert.alert('Davet oluşturulamadı', error instanceof Error ? error.message : 'Davet oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function createPassport(lostMode = false) {
    if (!requireLiveAccount() || !selectedPet) return;
    setBusy(true);
    try {
      const result = await createPassportShare(selectedPet.id, lostMode);
      await refresh();
      await Share.share({ message: `PetVitals Health Passport — ${selectedPet.name}\nErişim kodu: ${result.token}` });
    } catch (error) {
      Alert.alert('Pasaport oluşturulamadı', error instanceof Error ? error.message : 'Pasaport oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleLostMode(passportId: string, enabled: boolean) {
    if (!userId) return;
    setBusy(true);
    try {
      await setPassportLostMode(userId, passportId, enabled);
      await refresh();
    } catch (error) {
      Alert.alert('Güncellenemedi', error instanceof Error ? error.message : 'Lost Mode güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function revokePassport(passportId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await revokePassportShare(userId, passportId);
      await refresh();
    } catch (error) {
      Alert.alert('İptal edilemedi', error instanceof Error ? error.message : 'Pasaport iptal edilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PETVITALS PLATFORM</Text>
      <Text style={styles.title}>Dostunuzun tüm sağlık hayatı tek yerde.</Text>
      <Text style={styles.sub}>Sağlık skoru, paylaşım, pasaport, AI ve günlük yaşam araçları.</Text>

      {pets.length > 1 ? (
        <View style={styles.petPicker}>
          {pets.map(pet => (
            <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.petChip, selectedPet?.id === pet.id && styles.petChipActive]}>
              <Text style={[styles.petChipText, selectedPet?.id === pet.id && styles.petChipTextActive]}>{pet.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.scoreCard}>
        <View>
          <Text style={styles.scoreLabel}>{selectedPet?.name ?? 'Dostunuz'} Health Score</Text>
          <Text style={styles.scoreMeta}>{score?.label ?? 'Kayıt bekleniyor'}</Text>
        </View>
        <View style={styles.scoreBubble}><Text style={styles.scoreValue}>{score?.score ?? '—'}</Text></View>
      </View>
      {score?.reasons.slice(0, 2).map(reason => <Text key={reason} style={styles.reason}>• {reason}</Text>)}

      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      {showPaywall ? <ProPaywall active={proActive} onClose={() => setShowPaywall(false)} /> : null}
      {selectedPet && toolPanel === 'assistant' ? <AIAssistantPanel pet={selectedPet} onClose={() => setToolPanel(null)} /> : null}
      {selectedPet && toolPanel === 'scanner' ? <DocumentScannerPanel pet={selectedPet} onClose={() => setToolPanel(null)} /> : null}

      {actionPanel === 'weight' ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Kilo kaydı</Text>
          <TextInput keyboardType="decimal-pad" placeholder="Örn. 8.4 kg" placeholderTextColor={colors.muted} style={styles.input} value={weightValue} onChangeText={setWeightValue} />
          <Pressable disabled={busy} onPress={saveWeight} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</Text></Pressable>
        </View>
      ) : null}

      {actionPanel === 'life' ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>PetVitals Life</Text>
          <View style={styles.chips}>{lifeTypes.map(type => <Pressable key={type.key} onPress={() => setLifeType(type.key)} style={[styles.smallChip, lifeType === type.key && styles.smallChipActive]}><Text style={[styles.smallChipText, lifeType === type.key && styles.smallChipTextActive]}>{type.label}</Text></Pressable>)}</View>
          <TextInput placeholder="Değer (örn. 45 veya mutlu)" placeholderTextColor={colors.muted} style={styles.input} value={lifeValue} onChangeText={setLifeValue} />
          <TextInput placeholder="Birim (dk, ml, saat...)" placeholderTextColor={colors.muted} style={styles.input} value={lifeUnit} onChangeText={setLifeUnit} />
          <TextInput multiline placeholder="Not" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} value={lifeNotes} onChangeText={setLifeNotes} />
          <Pressable disabled={busy} onPress={saveLifeEntry} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{busy ? 'Kaydediliyor…' : 'Life kaydını ekle'}</Text></Pressable>
          {snapshot.lifeEntries.slice(0, 5).map(entry => <Text key={entry.id} style={styles.lifeRow}>• {lifeTypes.find(item => item.key === entry.entryType)?.label ?? entry.entryType}: {entry.valueNumeric ?? entry.valueText ?? entry.notes} {entry.unit ?? ''}</Text>)}
        </View>
      ) : null}

      {actionPanel === 'member' ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Care Network</Text>
          <View style={styles.chips}>{(['caregiver','veterinarian','viewer'] as PetMemberRole[]).map(role => <Pressable key={role} onPress={() => setMemberRole(role)} style={[styles.smallChip, memberRole === role && styles.smallChipActive]}><Text style={[styles.smallChipText, memberRole === role && styles.smallChipTextActive]}>{role === 'caregiver' ? 'Bakıcı/Aile' : role === 'veterinarian' ? 'Veteriner' : 'Sadece görüntüle'}</Text></Pressable>)}</View>
          <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-posta adresi" placeholderTextColor={colors.muted} style={styles.input} value={memberEmail} onChangeText={setMemberEmail} />
          <Pressable disabled={busy} onPress={saveMember} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{busy ? 'Hazırlanıyor…' : 'Erişim daveti oluştur'}</Text></Pressable>
        </View>
      ) : null}

      {actionPanel === 'passport' ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Universal Health Passport</Text>
          <View style={styles.buttonRow}>
            <Pressable disabled={busy} onPress={() => createPassport(false)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Pasaport oluştur</Text></Pressable>
            <Pressable disabled={busy} onPress={() => createPassport(true)} style={[styles.primaryButton, styles.dangerButton]}><Text style={styles.primaryButtonText}>Lost Mode oluştur</Text></Pressable>
          </View>
          {snapshot.passports.map(passport => (
            <View key={passport.id} style={styles.passportRow}>
              <View style={{ flex: 1 }}><Text style={styles.passportTitle}>{passport.lostMode ? '⚑ Lost Mode' : 'Health Passport'}</Text><Text style={styles.passportMeta}>{new Date(passport.createdAt).toLocaleDateString()}</Text></View>
              <Pressable disabled={busy} onPress={() => toggleLostMode(passport.id, !passport.lostMode)}><Text style={styles.link}>{passport.lostMode ? 'Lost kapat' : 'Lost aç'}</Text></Pressable>
              <Pressable disabled={busy} onPress={() => revokePassport(passport.id)}><Text style={styles.revoke}>İptal</Text></Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>Akıllı araçlar</Text>
      <FeatureCard icon="✦" title="AI Health Assistant" text="Kayıtları özetler, veteriner ziyaretine hazırlanmanıza yardım eder. Tanı koymaz." badge="PRO" status={proActive ? 'Pro erişimi aktif' : 'Pro ile açılır'} onPress={() => openProTool('assistant')} />
      <FeatureCard icon="▣" title="Belge Tarama" text="Aşı karnesi ve veteriner belgelerinden alanları çıkarıp onayınıza sunar." badge="AI" status={proActive ? 'Kullanıma hazır' : 'Pro ile açılır'} onPress={() => openProTool('scanner')} />
      <FeatureCard icon="⌁" title="Universal Health Passport" text="Aşı, alerji ve ilaçları süreli ve iptal edilebilir erişimle paylaşın." status={`${snapshot.activePassportCount} aktif paylaşım`} onPress={() => setActionPanel(actionPanel === 'passport' ? null : 'passport')} />
      <FeatureCard icon="👥" title="Care Network" text="Aile, bakıcı ve veteriner için kontrollü erişim oluşturun." status={`${snapshot.memberCount} aktif erişim`} onPress={() => setActionPanel(actionPanel === 'member' ? null : 'member')} />
      <FeatureCard icon="◉" title="PetVitals Life" text="Mama, su, aktivite, uyku, bakım ve ruh hali kayıtlarını sağlık hafızasına ekleyin." status={`${snapshot.lifeEntries.length} yakın dönem kaydı`} onPress={() => setActionPanel(actionPanel === 'life' ? null : 'life')} />
      <FeatureCard icon="↗" title="Kilo & Sağlık Trendleri" text="Zaman içindeki kilo ve sağlık değişimlerini tek bakışta takip edin." status={weightTrend} onPress={() => setActionPanel(actionPanel === 'weight' ? null : 'weight')} />
      <FeatureCard icon="★" title="PetVitals Pro" text="Gelişmiş AI, paylaşım ve analiz özellikleri için premium abonelik." badge="PRO" status={proActive ? 'Aktif' : 'Free plan'} onPress={() => setShowPaywall(true)} />

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>Privacy by design</Text>
        <Text style={styles.privacyText}>AI istekleri kimliği doğrulanmış sunucu fonksiyonundan yapılır. Gizli AI anahtarları mobil uygulamada tutulmaz ve belge sonuçları siz onaylamadan sağlık kaydına dönüşmez.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 7 },
  sub: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  petPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  petChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  petChipActive: { backgroundColor: colors.primary },
  petChipText: { color: colors.text, fontWeight: '700' },
  petChipTextActive: { color: colors.white },
  scoreCard: { ...shadow, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, padding: 20 },
  scoreLabel: { color: colors.white, fontSize: 17, fontWeight: '900' },
  scoreMeta: { color: '#DDEFE8', marginTop: 5 },
  scoreBubble: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 32, height: 64, justifyContent: 'center', width: 64 },
  scoreValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  reason: { color: colors.muted, fontSize: 12, marginTop: 6 },
  loader: { marginTop: 16 },
  error: { color: colors.danger, fontSize: 12, marginTop: 10 },
  section: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 12, marginTop: 28 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', marginBottom: 11, padding: 14 },
  cardIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  cardIconText: { fontSize: 20 },
  cardCopy: { flex: 1, marginLeft: 12 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  cardText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  cardStatus: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', marginTop: 6 },
  badge: { backgroundColor: '#FFF4E8', borderRadius: 8, color: colors.accent, fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 3 },
  chevron: { color: colors.muted, fontSize: 28, marginLeft: 8 },
  actionBox: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 16, padding: 16 },
  actionTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 10 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, marginTop: 9, paddingHorizontal: 12, paddingVertical: 11 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: 'center', marginTop: 11, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  dangerButton: { backgroundColor: colors.danger },
  buttonRow: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  smallChip: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  smallChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  smallChipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  smallChipTextActive: { color: colors.primaryDark },
  lifeRow: { color: colors.muted, fontSize: 12, marginTop: 8 },
  passportRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12 },
  passportTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  passportMeta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  link: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  revoke: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  privacyCard: { backgroundColor: '#EEF7F4', borderRadius: 18, marginTop: 10, padding: 17 },
  privacyTitle: { color: colors.primaryDark, fontWeight: '900' },
  privacyText: { color: colors.muted, lineHeight: 19, marginTop: 6 },
});
