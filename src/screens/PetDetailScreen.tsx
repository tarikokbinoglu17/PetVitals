import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { getPetAgeLabel, getPetRecords, getPetRecordSummary } from '../lib/petDetails';
import type { HealthRecord, Pet } from '../types';
import { colors, shadow } from '../theme';

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function categoryEmoji(category: HealthRecord['category']) {
  if (category === 'Aşı') return '💉';
  if (category === 'İlaç') return '💊';
  if (category === 'Alerji') return '⚠️';
  if (category === 'Laboratuvar') return '🧪';
  if (category === 'Operasyon') return '🏥';
  return '🩺';
}

function DetailLine({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailLine, last && styles.detailLineLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function PetDetailScreen({
  pet,
  records,
  onBack,
}: {
  pet: Pet;
  records: HealthRecord[];
  onBack: () => void;
}) {
  const petRecords = getPetRecords(pet.id, records);
  const summary = getPetRecordSummary(pet.id, records);
  const ageLabel = getPetAgeLabel(pet.birthDate);
  const upcoming = summary.upcomingRecord;

  return (
    <View style={styles.page}>
      <Pressable
        accessibilityLabel="Dostlarım listesine dön"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backText}>‹ Dostlarım</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          {pet.photoUrl ? (
            <Image
              accessibilityLabel={`${pet.name} profil fotoğrafı`}
              source={{ uri: pet.photoUrl }}
              style={styles.photo}
            />
          ) : (
            <Text style={styles.emoji}>
              {pet.species === 'Kedi' ? '🐱' : pet.species === 'Köpek' ? '🐶' : '🐾'}
            </Text>
          )}
        </View>
        <Text accessibilityRole="header" style={styles.name}>{pet.name}</Text>
        <Text style={styles.breed}>{pet.breed || pet.species}</Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>{pet.species}</Text>
          <Text style={styles.badge}>{ageLabel}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{pet.weight > 0 ? `${pet.weight} kg` : '—'}</Text>
          <Text style={styles.metricLabel}>Kilo</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{summary.recordCount}</Text>
          <Text style={styles.metricLabel}>Sağlık kaydı</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{summary.vaccineCount}</Text>
          <Text style={styles.metricLabel}>Aşı</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Profil bilgileri</Text>
      <View style={styles.card}>
        <DetailLine label="Tür" value={pet.species} />
        <DetailLine label="Irk" value={pet.breed || 'Belirtilmedi'} />
        <DetailLine label="Doğum tarihi" value={pet.birthDate ? formatDate(pet.birthDate) : 'Belirtilmedi'} />
        <DetailLine label="Yaş" value={ageLabel} />
        <DetailLine label="Cinsiyet" value="Henüz eklenmedi" />
        <DetailLine label="Mikroçip" value="Henüz eklenmedi" last />
      </View>

      <Text style={styles.sectionTitle}>Sağlık özeti</Text>
      <View style={styles.healthCard}>
        <View style={styles.healthIcon}><Text style={styles.healthIconText}>♡</Text></View>
        <View style={styles.healthCopy}>
          <Text style={styles.healthTitle}>
            {upcoming ? 'Yaklaşan bakım kaydı' : 'Yaklaşan bakım kaydı yok'}
          </Text>
          <Text style={styles.healthText}>
            {upcoming
              ? `${upcoming.title} · ${formatDate(upcoming.date)}`
              : 'Yeni bir aşı veya kontrol tarihi ekleyebilirsiniz.'}
          </Text>
          <Text style={[styles.allergy, summary.allergyCount > 0 && styles.allergyWarning]}>
            {summary.allergyCount > 0
              ? `${summary.allergyCount} aktif alerji kaydı`
              : 'Kayıtlı alerji bulunmuyor'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleInline}>Sağlık geçmişi</Text>
        <Text style={styles.recordCount}>{summary.recordCount} kayıt</Text>
      </View>
      {petRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Henüz sağlık kaydı yok</Text>
          <Text style={styles.emptyText}>Bu dosta ait aşı ve kontrol kayıtları burada görünecek.</Text>
        </View>
      ) : (
        petRecords.map(record => (
          <View key={record.id} style={styles.recordCard}>
            <View style={[styles.recordIcon, record.category === 'Alerji' && styles.recordIconDanger]}>
              <Text style={styles.recordEmoji}>{categoryEmoji(record.category)}</Text>
            </View>
            <View style={styles.recordCopy}>
              <View style={styles.recordTop}>
                <Text style={styles.category}>{record.category}</Text>
                <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
              </View>
              <Text style={styles.recordTitle}>{record.title}</Text>
              {record.vaccineType ? <Text style={styles.recordMeta}>{record.vaccineType}</Text> : null}
              {record.veterinarian ? <Text style={styles.recordMeta}>Veteriner: {record.veterinarian}</Text> : null}
              {record.notes ? <Text style={styles.notes}>{record.notes}</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  backButton: { alignSelf: 'flex-start', marginBottom: 14, paddingHorizontal: 2, paddingVertical: 8 },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.65 },
  hero: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 28, padding: 24 },
  avatar: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 46, height: 92, justifyContent: 'center', width: 92 },
  photo: { borderRadius: 46, height: 92, width: 92 },
  emoji: { fontSize: 46 },
  name: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 14 },
  breed: { color: colors.muted, fontSize: 15, marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  badge: { backgroundColor: colors.surface, borderRadius: 999, color: colors.primaryDark, fontSize: 12, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 7 },
  metrics: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metric: { ...shadow, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 17, flex: 1, minWidth: 0, paddingHorizontal: 7, paddingVertical: 15 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 10, marginTop: 26 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16 },
  detailLine: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 50, paddingVertical: 10 },
  detailLineLast: { borderBottomWidth: 0 },
  detailLabel: { color: colors.muted, flex: 1, fontSize: 13 },
  detailValue: { color: colors.text, flex: 1.4, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  healthCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', padding: 17 },
  healthIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 18, height: 46, justifyContent: 'center', width: 46 },
  healthIconText: { color: colors.primary, fontSize: 25, fontWeight: '800' },
  healthCopy: { flex: 1, marginLeft: 13 },
  healthTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  healthText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  allergy: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 9, color: colors.primaryDark, fontSize: 11, fontWeight: '800', marginTop: 10, paddingHorizontal: 9, paddingVertical: 6 },
  allergyWarning: { backgroundColor: '#FBE5E5', color: colors.danger },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 26 },
  sectionTitleInline: { color: colors.text, fontSize: 20, fontWeight: '900' },
  recordCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 26 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 10 },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'center' },
  recordCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15 },
  recordIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  recordIconDanger: { backgroundColor: '#FBE5E5' },
  recordEmoji: { fontSize: 20 },
  recordCopy: { flex: 1, marginLeft: 12 },
  recordTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  category: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  recordDate: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  recordTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 5 },
  recordMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  notes: { backgroundColor: colors.background, borderRadius: 9, color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8, padding: 8 },
});
