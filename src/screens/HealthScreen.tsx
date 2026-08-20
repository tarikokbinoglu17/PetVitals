import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HealthRecord, Pet } from '../types';
import { colors } from '../theme';

export function HealthScreen({ pets, records }: { pets: Pet[]; records: HealthRecord[] }) {
  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date));

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Sağlık takvimi</Text>
      <Text style={styles.sub}>Kontrol, aşı ve ilaç planı.</Text>
      {sortedRecords.length === 0 ? <Text style={styles.empty}>Henüz bir sağlık kaydı eklenmemiş.</Text> : null}
      {sortedRecords.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.lineWrap}>
            <View style={[styles.dot, { backgroundColor: item.category === 'İlaç' ? colors.accent : colors.primary }]} />
            {index < sortedRecords.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.date}>{new Date(`${item.date}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</Text>
            </View>
            <Text style={styles.record}>{item.title}</Text>
            <Text style={styles.pet}>{pets.find(pet => pet.id === item.petId)?.name ?? 'Dostunuz'}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  sub: { color: colors.muted, marginBottom: 25, marginTop: 5 },
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
  pet: { color: colors.muted, marginTop: 5 },
  notes: { backgroundColor: colors.background, borderRadius: 9, color: colors.muted, marginTop: 10, padding: 9 },
});
