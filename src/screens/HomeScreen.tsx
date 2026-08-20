import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { demoPets, demoRecords } from '../data/demo';
import { colors, shadow } from '../theme';

export function HomeScreen() {
  const next = demoRecords[0];
  return <View style={styles.page}>
    <Text style={styles.eyebrow}>20 AĞUSTOS, PERŞEMBE</Text>
    <Text style={styles.title}>Günaydın! 👋</Text>
    <Text style={styles.sub}>Bugün dostlarınızın keyfi nasıl?</Text>
    <View style={styles.hero}>
      <View><Text style={styles.heroLabel}>Sıradaki hatırlatma</Text><Text style={styles.heroTitle}>{next.title}</Text><Text style={styles.heroMeta}>Moka • 2 Eylül</Text></View>
      <Text style={styles.heroIcon}>💉</Text>
    </View>
    <Text style={styles.section}>Genel bakış</Text>
    <View style={styles.row}>
      <View style={styles.stat}><Text style={styles.statIcon}>🐾</Text><Text style={styles.statValue}>{demoPets.length}</Text><Text style={styles.statLabel}>Dostum</Text></View>
      <View style={styles.stat}><Text style={styles.statIcon}>🗓️</Text><Text style={styles.statValue}>2</Text><Text style={styles.statLabel}>Yaklaşan</Text></View>
    </View>
    <View style={styles.tip}><Text style={styles.tipIcon}>💡</Text><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Günün ipucu</Text><Text style={styles.tipText}>Düzenli kilo takibi, sağlık değişikliklerini erken fark etmenize yardımcı olur.</Text></View></View>
  </View>;
}

const styles = StyleSheet.create({
  page: { padding: 22 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 5 }, sub: { color: colors.muted, fontSize: 15, marginTop: 5 },
  hero: { ...shadow, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, padding: 22 }, heroLabel: { color: '#BFE4D7', fontSize: 12, fontWeight: '700' }, heroTitle: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 7 }, heroMeta: { color: '#DDEFE8', marginTop: 8 }, heroIcon: { fontSize: 36 },
  section: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: 12, marginTop: 28 }, row: { flexDirection: 'row', gap: 12 }, stat: { ...shadow, backgroundColor: colors.surface, borderRadius: 18, flex: 1, padding: 18 }, statIcon: { fontSize: 24 }, statValue: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 10 }, statLabel: { color: colors.muted, marginTop: 2 },
  tip: { backgroundColor: '#FFF4E8', borderRadius: 18, flexDirection: 'row', gap: 13, marginTop: 20, padding: 17 }, tipIcon: { fontSize: 22 }, tipTitle: { color: colors.text, fontWeight: '800' }, tipText: { color: colors.muted, lineHeight: 20, marginTop: 5 },
});

