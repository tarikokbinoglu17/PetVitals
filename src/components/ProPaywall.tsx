import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { billingPlans, getBillingSetupMessage, revenueCatConfigured } from '../lib/billing';
import { colors, shadow } from '../theme';

export function ProPaywall({ active, onClose }: { active: boolean; onClose: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  if (active) {
    return (
      <View style={styles.activeCard}>
        <Text style={styles.activeIcon}>★</Text>
        <Text style={styles.activeTitle}>PetVitals Pro aktif</Text>
        <Text style={styles.activeText}>AI, gelişmiş analiz ve premium paylaşım özelliklerine erişiminiz açık.</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Kapat</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PETVITALS PRO</Text>
          <Text style={styles.title}>Daha akıllı sağlık takibi.</Text>
        </View>
        <Pressable accessibilityLabel="Pro ekranını kapat" accessibilityRole="button" onPress={onClose}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      <View style={styles.benefits}>
        <Text style={styles.benefit}>✓ AI Health Assistant</Text>
        <Text style={styles.benefit}>✓ Belge ve aşı karnesi tarama</Text>
        <Text style={styles.benefit}>✓ Gelişmiş Health Score ve trendler</Text>
        <Text style={styles.benefit}>✓ Aile, bakıcı ve veteriner paylaşımı</Text>
        <Text style={styles.benefit}>✓ Gelişmiş Health Passport ve Lost Mode</Text>
      </View>

      {billingPlans.map(plan => {
        const selected = selectedPlan === plan.id;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={plan.id}
            onPress={() => setSelectedPlan(plan.id)}
            style={[styles.plan, selected && styles.planSelected]}
          >
            <View style={styles.radio}>{selected ? <View style={styles.radioInner} /> : null}</View>
            <View style={{ flex: 1 }}>
              <View style={styles.planTitleRow}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
              </View>
              <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
            </View>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        disabled={!revenueCatConfigured}
        style={[styles.primaryButton, !revenueCatConfigured && styles.disabled]}
      >
        <Text style={styles.primaryButtonText}>
          {revenueCatConfigured ? `${selectedPlan === 'annual' ? 'Yıllık' : 'Aylık'} Pro'ya geç` : 'Ödeme kurulumu bekleniyor'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={!revenueCatConfigured} style={styles.restoreButton}>
        <Text style={[styles.restoreText, !revenueCatConfigured && styles.restoreDisabled]}>Satın alımları geri yükle</Text>
      </Pressable>
      <Text style={styles.setup}>{getBillingSetupMessage()}</Text>
      <Text style={styles.legal}>Abonelik mağaza hesabınız üzerinden yönetilir. Satın alma öncesinde mağazanın yerel fiyatı ve yenileme koşulları gösterilir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, marginTop: 18, padding: 18 },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 5 },
  close: { color: colors.muted, fontSize: 30, lineHeight: 30 },
  benefits: { backgroundColor: colors.background, borderRadius: 16, gap: 8, marginTop: 16, padding: 14 },
  benefit: { color: colors.text, fontSize: 13, fontWeight: '700' },
  plan: { alignItems: 'center', borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, padding: 14 },
  planSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  radio: { alignItems: 'center', borderColor: colors.primary, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', width: 20 },
  radioInner: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 },
  planTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  planTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  planSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: '#FFF4E8', borderRadius: 8, color: colors.accent, fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 3 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, marginTop: 16, minHeight: 54, justifyContent: 'center', paddingHorizontal: 18 },
  disabled: { opacity: 0.55 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  restoreButton: { alignItems: 'center', paddingVertical: 14 },
  restoreText: { color: colors.primaryDark, fontWeight: '800' },
  restoreDisabled: { color: colors.muted },
  setup: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  legal: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8, textAlign: 'center' },
  activeCard: { ...shadow, alignItems: 'center', backgroundColor: '#EEF7F4', borderRadius: 24, marginTop: 18, padding: 22 },
  activeIcon: { fontSize: 34 },
  activeTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: '900', marginTop: 8 },
  activeText: { color: colors.muted, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  secondaryButton: { backgroundColor: colors.surface, borderRadius: 14, marginTop: 16, paddingHorizontal: 22, paddingVertical: 12 },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: '800' },
});
