import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VaccineForm } from '../components/VaccineForm';
import type { HealthRecord, Pet, SaveVaccineResult, VaccineDraft, VaccineNotificationStatus } from '../types';
import { colors } from '../theme';

function getNotificationLabel(status?: VaccineNotificationStatus) {
  if (status === 'scheduled') return '🔔 Hatırlatmalar açık';
  if (status === 'denied') return 'Bildirim izni kapalı';
  if (status === 'failed') return 'Bildirim kurulamadı';
  if (status === 'no_future_dates') return 'Gelecek bildirim yok';
  if (status === 'disabled') return 'Bildirim kapalı';
  return null;
}

export function HealthScreen({
  pets,
  records,
  savingVaccine,
  onAddVaccine,
}: {
  pets: Pet[];
  records: HealthRecord[];
  savingVaccine: boolean;
  onAddVaccine: (draft: VaccineDraft) => Promise<SaveVaccineResult>;
}) {
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date));

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Sağlık takvimi</Text>
          <Text style={styles.sub}>Kontrol, aşı ve ilaç planı.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowVaccineForm(value => !value)}
          style={[styles.addButton, showVaccineForm && styles.addButtonActive]}
        >
          <Text style={[styles.addButtonText, showVaccineForm && styles.addButtonTextActive]}>
            {showVaccineForm ? 'Kapat' : '＋ Aşı ekle'}
          </Text>
        </Pressable>
      </View>

      {showVaccineForm ? (
        <VaccineForm onSave={onAddVaccine} pets={pets} saving={savingVaccine} />
      ) : null}

      {sortedRecords.length === 0 ? (
        <Text style={styles.empty}>Henüz bir sağlık kaydı eklenmemiş.</Text>
      ) : null}
      {sortedRecords.map((item, index) => {
        const notificationLabel = item.category === 'Aşı' ? getNotificationLabel(item.notificationStatus) : null;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.lineWrap}>
              <View style={[styles.dot, { backgroundColor: item.category === 'İlaç' ? colors.accent : colors.primary }]} />
              {index < sortedRecords.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.date}>
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={styles.record}>{item.title}</Text>
              {item.vaccineType ? <Text style={styles.vaccineType}>{item.vaccineType}</Text> : null}
              <Text style={styles.pet}>{pets.find(pet => pet.id === item.petId)?.name ?? 'Dostunuz'}</Text>
              {item.administeredDate ? (
                <Text style={styles.meta}>Uygulandı: {new Date(`${item.administeredDate}T00:00:00`).toLocaleDateString('tr-TR')}</Text>
              ) : null}
              {item.veterinarian ? <Text style={styles.meta}>Veteriner: {item.veterinarian}</Text> : null}
              {notificationLabel ? <Text style={styles.notificationBadge}>{notificationLabel}</Text> : null}
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  sub: { color: colors.muted, marginBottom: 25, marginTop: 5 },
  addButton: { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  addButtonActive: { backgroundColor: colors.surface },
  addButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  addButtonTextActive: { color: colors.primary },
  empty: { color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row' },
  lineWrap: { alignItems: 'center', width: 28 },
  dot: { borderRadius: 7, height: 14, marginTop: 20, width: 14 },
  line: { backgroundColor: colors.border, flex: 1, width: 2 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, marginBottom: 14, padding: 17 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  category: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  date: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  record: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 8 },
  vaccineType: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  pet: { color: colors.muted, marginTop: 5 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  notificationBadge: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 10, color: colors.primaryDark, fontSize: 11, fontWeight: '800', marginTop: 10, paddingHorizontal: 9, paddingVertical: 6 },
  notes: { backgroundColor: colors.background, borderRadius: 9, color: colors.muted, marginTop: 10, padding: 9 },
});
