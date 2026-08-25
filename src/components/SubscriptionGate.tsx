import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { billingPlans, getBillingSetupMessage, revenueCatConfigured } from '../lib/billing';
import { colors, shadow } from '../theme';

export function SubscriptionGate() {
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PETVITALS PREMIUM</Text>
        <Text style={styles.title}>7 günlük ücretsiz denemeniz sona erdi.</Text>
        <Text style={styles.sub}>Dostunuzun sağlık geçmişine, hatırlatmalarına, AI araçlarına ve PetVitals'ın tüm özelliklerine devam etmek için Premium'u etkinleştirin.</Text>

        <View style={styles.benefits}>
          <Text style={styles.benefit}>✓ Tüm evcil hayvanlar ve sağlık kayıtları</Text>
          <Text style={styles.benefit}>✓ Aşı ve ilaç hatırlatmaları</Text>
          <Text style={styles.benefit}>✓ AI Health Assistant ve belge tarama</Text>
          <Text style={styles.benefit}>✓ Health Passport, paylaşım ve sağlık trendleri</Text>
          <Text style={styles.benefit}>✓ Yakındaki veterinerler ve PetVitals Life</Text>
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
                <View style={styles.row}>
                  <Text style={styles.planTitle}>{plan.id === 'annual' ? 'Yıllık Premium' : 'Aylık Premium'}</Text>
                  {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
                </View>
                <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable accessibilityRole="button" disabled={!revenueCatConfigured} style={[styles.cta, !revenueCatConfigured && styles.disabled]}>
          <Text style={styles.ctaText}>{revenueCatConfigured ? 'Premium’a devam et' : 'Ödeme kurulumu bekleniyor'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!revenueCatConfigured} style={styles.restore}>
          <Text style={[styles.restoreText, !revenueCatConfigured && styles.restoreDisabled]}>Satın alımları geri yükle</Text>
        </Pressable>

        <Text style={styles.setup}>{getBillingSetupMessage()}</Text>
        <Text style={styles.legal}>Abonelik otomatik yenilenir ve mağaza hesabınızdan yönetilir. Yerel fiyat ve yenileme koşulları satın alma ekranında gösterilir.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 22 },
  card: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 26, borderWidth: 1, maxWidth: 560, padding: 22, width: '100%' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 7 },
  sub: { color: colors.muted, lineHeight: 21, marginTop: 10 },
  benefits: { backgroundColor: colors.background, borderRadius: 16, gap: 8, marginTop: 18, padding: 14 },
  benefit: { color: colors.text, fontSize: 13, fontWeight: '700' },
  plan: { alignItems: 'center', borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, padding: 14 },
  planSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  radio: { alignItems: 'center', borderColor: colors.primary, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', width: 20 },
  radioInner: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  planTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  planSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: '#FFF4E8', borderRadius: 8, color: colors.accent, fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 3 },
  cta: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, justifyContent: 'center', marginTop: 17, minHeight: 54 },
  disabled: { opacity: 0.55 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  restore: { alignItems: 'center', paddingVertical: 14 },
  restoreText: { color: colors.primaryDark, fontWeight: '800' },
  restoreDisabled: { color: colors.muted },
  setup: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  legal: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8, textAlign: 'center' },
});
