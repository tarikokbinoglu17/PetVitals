import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { calculateHealthScore } from '../lib/healthScore';
import {
  addWeightEntry,
  createPassportShare,
  invitePetMember,
  loadPlatformSnapshot,
  revokePassportShare,
  setPassportLostMode,
  type PlatformSnapshot,
} from '../lib/platformData';
import type { HealthRecord, Pet, PetMemberRole } from '../types';
import { colors, shadow } from '../theme';

const emptySnapshot: PlatformSnapshot = { weights: [], memberCount: 0, activePassportCount: 0, passports: [], pro: { plan: 'free' } };

type Action = 'weight' | 'invite' | 'passport' | null;

export function PlatformScreen({ pets, records, userId, demoMode }: { pets: Pet[]; records: HealthRecord[]; userId?: string; demoMode: boolean }) {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id);
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [weight, setWeight] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PetMemberRole>('caregiver');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const selectedPet = pets.find(pet => pet.id === selectedPetId) ?? pets[0];

  const refresh = useCallback(async () => {
    if (!selectedPet || !userId || demoMode) { setSnapshot(emptySnapshot); return; }
    setLoading(true);
    try { setSnapshot(await loadPlatformSnapshot(userId, selectedPet.id)); }
    catch { Alert.alert('PetVitals+', 'Veriler şu anda yüklenemedi.'); }
    finally { setLoading(false); }
  }, [demoMode, selectedPet, userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const score = useMemo(() => selectedPet ? calculateHealthScore(selectedPet, records, snapshot.weights) : null, [records, selectedPet, snapshot.weights]);
  const lastWeight = snapshot.weights.at(-1);
  const previousWeight = snapshot.weights.at(-2);
  const weightTrend = lastWeight && previousWeight
    ? `${lastWeight.weight > previousWeight.weight ? '↑' : lastWeight.weight < previousWeight.weight ? '↓' : '→'} ${lastWeight.weight.toFixed(1)} kg`
    : lastWeight ? `${lastWeight.weight.toFixed(1)} kg` : 'Henüz kilo geçmişi yok';

  async function run(task: () => Promise<void>) {
    if (demoMode || !userId || !selectedPet) { Alert.alert('Demo modu', 'Bu işlem gerçek hesapla giriş yaptığınızda kullanılabilir.'); return; }
    setBusy(true);
    try { await task(); await refresh(); }
    catch (error) { Alert.alert('İşlem tamamlanamadı', error instanceof Error ? error.message : 'Lütfen tekrar deneyin.'); }
    finally { setBusy(false); }
  }

  const addWeight = () => run(async () => {
    await addWeightEntry(userId!, selectedPet!.id, Number(weight.replace(',', '.')));
    setWeight(''); setAction(null);
  });

  const invite = () => run(async () => {
    await invitePetMember(userId!, selectedPet!.id, email, role);
    setEmail(''); setAction(null);
    Alert.alert('Davet hazır', 'Erişim daveti kaydedildi. Davet teslim mekanizması e-posta servisi bağlandığında otomatik gönderilecek.');
  });

  const createPassport = (lostMode = false) => run(async () => {
    const result = await createPassportShare(selectedPet!.id, lostMode);
    setShareToken(result.token); setAction('passport');
  });

  const sharePassport = async () => {
    if (!shareToken) return;
    await Share.share({ message: `PetVitals Health Passport — ${selectedPet?.name ?? ''}\n${shareToken}` });
  };

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PETVITALS PLATFORM</Text>
      <Text style={styles.title}>Dostunuzun tüm sağlık hayatı tek yerde.</Text>
      <Text style={styles.sub}>Sağlık skoru, paylaşım, pasaport, AI ve bakım araçları.</Text>

      {pets.length > 1 ? <View style={styles.petPicker}>{pets.map(pet => <Pressable key={pet.id} onPress={() => { setSelectedPetId(pet.id); setShareToken(null); }} style={[styles.petChip, selectedPet?.id === pet.id && styles.petChipActive]}><Text style={[styles.petChipText, selectedPet?.id === pet.id && styles.petChipTextActive]}>{pet.name}</Text></Pressable>)}</View> : null}

      <View style={styles.scoreCard}><View><Text style={styles.scoreLabel}>{selectedPet?.name ?? 'Dostunuz'} Health Score</Text><Text style={styles.scoreMeta}>{score?.label ?? 'Kayıt bekleniyor'}</Text></View><View style={styles.scoreBubble}><Text style={styles.scoreValue}>{score?.score ?? '—'}</Text></View></View>
      {score?.reasons.slice(0, 2).map(reason => <Text key={reason} style={styles.reason}>• {reason}</Text>)}
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

      <Text style={styles.section}>Hızlı işlemler</Text>
      <View style={styles.quickRow}>
        <Pressable style={styles.quickButton} onPress={() => setAction(action === 'weight' ? null : 'weight')}><Text style={styles.quickIcon}>↗</Text><Text style={styles.quickText}>Kilo ekle</Text></Pressable>
        <Pressable style={styles.quickButton} onPress={() => setAction(action === 'invite' ? null : 'invite')}><Text style={styles.quickIcon}>👥</Text><Text style={styles.quickText}>Erişim ver</Text></Pressable>
        <Pressable style={styles.quickButton} onPress={() => void createPassport(false)}><Text style={styles.quickIcon}>⌁</Text><Text style={styles.quickText}>Pasaport</Text></Pressable>
      </View>

      {action === 'weight' ? <View style={styles.panel}><Text style={styles.panelTitle}>Yeni kilo kaydı</Text><TextInput accessibilityLabel="Kilo" keyboardType="decimal-pad" onChangeText={setWeight} placeholder="Örn. 8,4 kg" style={styles.input} value={weight} /><Pressable disabled={busy} onPress={addWeight} style={styles.primary}><Text style={styles.primaryText}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</Text></Pressable></View> : null}

      {action === 'invite' ? <View style={styles.panel}><Text style={styles.panelTitle}>Aile / veteriner erişimi</Text><TextInput accessibilityLabel="Davet e-postası" autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="email@example.com" style={styles.input} value={email} /><View style={styles.roleRow}>{(['caregiver','veterinarian','viewer'] as PetMemberRole[]).map(value => <Pressable key={value} onPress={() => setRole(value)} style={[styles.roleChip, role === value && styles.roleChipActive]}><Text style={[styles.roleText, role === value && styles.roleTextActive]}>{value === 'caregiver' ? 'Bakıcı' : value === 'veterinarian' ? 'Veteriner' : 'Görüntüleme'}</Text></Pressable>)}</View><Pressable disabled={busy} onPress={invite} style={styles.primary}><Text style={styles.primaryText}>{busy ? 'Kaydediliyor…' : 'Erişim daveti oluştur'}</Text></Pressable></View> : null}

      {action === 'passport' && shareToken ? <View style={styles.panel}><Text style={styles.panelTitle}>Health Passport hazır</Text><Text style={styles.tokenLabel}>Bu güvenli anahtar yalnızca şimdi gösterilir.</Text><Text selectable style={styles.token}>{shareToken}</Text><Pressable onPress={sharePassport} style={styles.primary}><Text style={styles.primaryText}>Paylaş</Text></Pressable></View> : null}

      <Text style={styles.section}>Sağlık & paylaşım</Text>
      <View style={styles.card}><View style={styles.cardIcon}><Text style={styles.cardIconText}>⌁</Text></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>Health Passport</Text><Text style={styles.cardText}>{snapshot.activePassportCount} aktif paylaşım</Text></View><Pressable onPress={() => void createPassport(false)}><Text style={styles.actionText}>Oluştur</Text></Pressable></View>
      <View style={styles.card}><View style={styles.cardIcon}><Text style={styles.cardIconText}>⚑</Text></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>Lost Mode</Text><Text style={styles.cardText}>Kayıp durumda iletişim paylaşımını kontrollü biçimde açın.</Text></View><Pressable onPress={() => void createPassport(true)}><Text style={styles.actionText}>Aç</Text></Pressable></View>
      {snapshot.passports.map(passport => <View key={passport.id} style={styles.passportRow}><View style={{ flex: 1 }}><Text style={styles.passportTitle}>{passport.lostMode ? '⚑ Lost Mode pasaportu' : 'Health Passport'}</Text><Text style={styles.cardText}>{new Date(passport.createdAt).toLocaleDateString('tr-TR')}</Text></View><Pressable onPress={() => void run(() => setPassportLostMode(userId!, passport.id, !passport.lostMode))}><Text style={styles.smallAction}>{passport.lostMode ? 'Lost kapat' : 'Lost aç'}</Text></Pressable><Pressable onPress={() => void run(() => revokePassportShare(userId!, passport.id))}><Text style={[styles.smallAction, { color: colors.danger }]}>İptal</Text></Pressable></View>)}

      <View style={styles.card}><View style={styles.cardIcon}><Text style={styles.cardIconText}>👥</Text></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>Aile & Veteriner</Text><Text style={styles.cardText}>{snapshot.memberCount} aktif erişim</Text></View><Pressable onPress={() => setAction('invite')}><Text style={styles.actionText}>Davet</Text></Pressable></View>
      <View style={styles.card}><View style={styles.cardIcon}><Text style={styles.cardIconText}>↗</Text></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>Kilo Trendleri</Text><Text style={styles.cardText}>{weightTrend} · {snapshot.weights.length} kayıt</Text></View><Pressable onPress={() => setAction('weight')}><Text style={styles.actionText}>Ekle</Text></Pressable></View>
      <View style={styles.card}><View style={styles.cardIcon}><Text style={styles.cardIconText}>✦</Text></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>AI Health Assistant</Text><Text style={styles.cardText}>Sağlık geçmişini özetleyen, tanı koymayan yardımcı.</Text></View><Text style={styles.proBadge}>{snapshot.pro.plan === 'pro' ? 'PRO ✓' : 'PRO'}</Text></View>

      <View style={styles.privacyCard}><Text style={styles.privacyTitle}>Privacy by design</Text><Text style={styles.privacyText}>Pasaport anahtarı veritabanında düz metin tutulmaz; hash saklanır. Paylaşım her an iptal edilebilir.</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 7 }, sub: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  petPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }, petChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, petChipActive: { backgroundColor: colors.primary }, petChipText: { color: colors.text, fontWeight: '700' }, petChipTextActive: { color: colors.white },
  scoreCard: { ...shadow, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, padding: 20 }, scoreLabel: { color: colors.white, fontSize: 17, fontWeight: '900' }, scoreMeta: { color: '#DDEFE8', marginTop: 5 }, scoreBubble: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 32, height: 64, justifyContent: 'center', width: 64 }, scoreValue: { color: colors.primary, fontSize: 22, fontWeight: '900' }, reason: { color: colors.muted, fontSize: 12, marginTop: 6 }, loader: { marginTop: 16 },
  section: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 12, marginTop: 26 }, quickRow: { flexDirection: 'row', gap: 9 }, quickButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flex: 1, padding: 13 }, quickIcon: { fontSize: 20 }, quickText: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 5 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 15 }, panelTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, marginTop: 12, paddingHorizontal: 12, paddingVertical: 11 }, primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, marginTop: 12, padding: 12 }, primaryText: { color: colors.white, fontWeight: '900' }, roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, roleChip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }, roleChipActive: { backgroundColor: colors.primary }, roleText: { color: colors.muted, fontSize: 11, fontWeight: '800' }, roleTextActive: { color: colors.white }, tokenLabel: { color: colors.muted, fontSize: 12, marginTop: 8 }, token: { backgroundColor: colors.background, borderRadius: 10, color: colors.text, fontSize: 11, marginTop: 8, padding: 10 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', marginBottom: 10, padding: 14 }, cardIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 }, cardIconText: { fontSize: 20 }, cardCopy: { flex: 1, marginLeft: 12 }, cardTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, cardText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, actionText: { color: colors.primary, fontSize: 12, fontWeight: '900', padding: 8 }, proBadge: { backgroundColor: '#FFF4E8', borderRadius: 8, color: colors.accent, fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4 },
  passportRow: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 14, flexDirection: 'row', gap: 6, marginBottom: 8, padding: 11 }, passportTitle: { color: colors.text, fontSize: 12, fontWeight: '800' }, smallAction: { color: colors.primary, fontSize: 10, fontWeight: '900', padding: 5 }, privacyCard: { backgroundColor: '#EEF7F4', borderRadius: 18, marginTop: 12, padding: 17 }, privacyTitle: { color: colors.primaryDark, fontWeight: '900' }, privacyText: { color: colors.muted, lineHeight: 19, marginTop: 6 },
});
