import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { calculateHealthScore } from '../lib/healthScore';
import type { HealthRecord, Pet } from '../types';
import { colors, shadow } from '../theme';

type FeatureCardProps = {
  icon: string;
  title: string;
  text: string;
  badge?: string;
  onPress?: () => void;
};

function FeatureCard({ icon, title, text, badge, onPress }: FeatureCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardIcon}><Text style={styles.cardIconText}>{icon}</Text></View>
      <View style={styles.cardCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.cardText}>{text}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function PlatformScreen({ pets, records }: { pets: Pet[]; records: HealthRecord[] }) {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id);
  const selectedPet = pets.find(pet => pet.id === selectedPetId) ?? pets[0];
  const score = useMemo(
    () => selectedPet ? calculateHealthScore(selectedPet, records) : null,
    [records, selectedPet],
  );

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PETVITALS PLATFORM</Text>
      <Text style={styles.title}>Dostunuzun tüm sağlık hayatı tek yerde.</Text>
      <Text style={styles.sub}>Sağlık skoru, paylaşım, pasaport, AI ve bakım araçları.</Text>

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

      <Text style={styles.section}>Akıllı araçlar</Text>
      <FeatureCard icon="✦" title="AI Health Assistant" text="Kayıtları özetler, veteriner ziyaretine hazırlanmanıza yardım eder. Tanı koymaz." badge="PRO" />
      <FeatureCard icon="▣" title="Belge Tarama" text="Aşı karnesi ve veteriner belgelerinden alanları çıkarıp onayınıza sunar." badge="AI" />
      <FeatureCard icon="⌁" title="QR Health Passport" text="Aşı, alerji ve ilaçları süreli ve iptal edilebilir erişimle paylaşın." />
      <FeatureCard icon="👥" title="Aile & Bakıcı Paylaşımı" text="Aynı dostu aile veya bakıcılarla birlikte yönetin." />
      <FeatureCard icon="⚕" title="Veteriner Modu" text="Veterinere yalnızca seçtiğiniz bilgiler için süreli erişim verin." />
      <FeatureCard icon="⚑" title="Lost Mode" text="Kayıp durumda güvenli iletişim ve kritik sağlık bilgilerini açın." />
      <FeatureCard icon="↗" title="Kilo & Sağlık Trendleri" text="Zaman içindeki kilo ve sağlık değişimlerini tek bakışta takip edin." />
      <FeatureCard icon="★" title="PetVitals Pro" text="Gelişmiş AI, paylaşım ve analiz özellikleri için hazır abonelik katmanı." badge="PRO" />

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>Privacy by design</Text>
        <Text style={styles.privacyText}>Paylaşımlar iptal edilebilir ve süreli tasarlanır. AI özellikleri özel sağlık verisini cihaz içine gizli anahtar koyarak işlemez.</Text>
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
  section: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 12, marginTop: 28 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', marginBottom: 11, padding: 14 },
  cardIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  cardIconText: { fontSize: 20 },
  cardCopy: { flex: 1, marginLeft: 12 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  cardText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  badge: { backgroundColor: '#FFF4E8', borderRadius: 8, color: colors.accent, fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 3 },
  chevron: { color: colors.muted, fontSize: 28, marginLeft: 8 },
  privacyCard: { backgroundColor: '#EEF7F4', borderRadius: 18, marginTop: 10, padding: 17 },
  privacyTitle: { color: colors.primaryDark, fontWeight: '900' },
  privacyText: { color: colors.muted, lineHeight: 19, marginTop: 6 },
});
