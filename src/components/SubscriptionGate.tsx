import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePreferences } from "../context/PreferencesContext";
import { useSubscription } from "../context/SubscriptionContext";
import type { BillingPlanId } from "../lib/billing";
import { colors, shadow } from "../theme";

const copy = {
  tr: {
    title: "7 günlük ücretsiz denemeniz sona erdi.",
    sub: "Dostunuzun sağlık geçmişine, hatırlatmalarına, AI araçlarına ve PetVitals'ın tüm özelliklerine devam etmek için Premium'u etkinleştirin.",
    benefits: [
      "Tüm evcil hayvanlar ve sağlık kayıtları",
      "Aşı ve ilaç hatırlatmaları",
      "AI Health Assistant ve belge tarama",
      "Health Passport, paylaşım ve sağlık trendleri",
      "Yakındaki veterinerler ve PetVitals Life",
    ],
    annual: "Yıllık Premium",
    monthly: "Aylık Premium",
    annualSub: "En avantajlı plan",
    monthlySub: "Esnek aylık abonelik",
    recommended: "ÖNERİLEN",
    continue: "Premium’a devam et",
    pending: "Ödeme kurulumu bekleniyor",
    processing: "Mağaza işlemi sürüyor…",
    restore: "Satın alımları geri yükle",
    setup: "Mağaza ürünleri bağlandığında yerel fiyat ve satın alma açılır.",
    legal: "Abonelik otomatik yenilenir ve mağaza hesabınızdan yönetilir. Yerel fiyat ve yenileme koşulları satın alma ekranında gösterilir.",
  },
  en: {
    title: "Your 7-day free trial has ended.",
    sub: "Activate Premium to keep access to health history, reminders, AI tools and all PetVitals features.",
    benefits: [
      "All pets and health records",
      "Vaccine and medication reminders",
      "AI Health Assistant and document scanning",
      "Health Passport, sharing and health trends",
      "Nearby veterinarians and PetVitals Life",
    ],
    annual: "Annual Premium",
    monthly: "Monthly Premium",
    annualSub: "Best value",
    monthlySub: "Flexible monthly subscription",
    recommended: "RECOMMENDED",
    continue: "Continue with Premium",
    pending: "Payment setup pending",
    processing: "Store purchase in progress…",
    restore: "Restore purchases",
    setup: "Local pricing and purchases appear after store products are connected.",
    legal: "Subscription renews automatically and is managed through your store account. Local pricing and renewal terms are shown before purchase.",
  },
  de: {
    title: "Ihre 7-tägige kostenlose Testphase ist beendet.",
    sub: "Aktivieren Sie Premium, um Gesundheitsdaten, Erinnerungen, AI-Tools und alle PetVitals-Funktionen weiter zu nutzen.",
    benefits: [
      "Alle Tiere und Gesundheitsdaten",
      "Impf- und Medikamentenerinnerungen",
      "AI Health Assistant und Dokumentenscan",
      "Health Passport, Freigabe und Gesundheitstrends",
      "Tierärzte in der Nähe und PetVitals Life",
    ],
    annual: "Premium jährlich",
    monthly: "Premium monatlich",
    annualSub: "Bestes Angebot",
    monthlySub: "Flexible monatliche Mitgliedschaft",
    recommended: "EMPFOHLEN",
    continue: "Mit Premium fortfahren",
    pending: "Zahlungseinrichtung ausstehend",
    processing: "Store-Vorgang läuft…",
    restore: "Käufe wiederherstellen",
    setup: "Lokale Preise erscheinen nach Verbindung der Store-Produkte.",
    legal: "Das Abonnement verlängert sich automatisch und wird über Ihr Store-Konto verwaltet. Lokale Preise und Bedingungen werden vor dem Kauf angezeigt.",
  },
  es: {
    title: "Tu prueba gratuita de 7 días ha terminado.",
    sub: "Activa Premium para seguir accediendo al historial de salud, recordatorios, herramientas de IA y todas las funciones de PetVitals.",
    benefits: [
      "Todas las mascotas y registros de salud",
      "Recordatorios de vacunas y medicamentos",
      "AI Health Assistant y escaneo de documentos",
      "Health Passport, uso compartido y tendencias",
      "Veterinarios cercanos y PetVitals Life",
    ],
    annual: "Premium anual",
    monthly: "Premium mensual",
    annualSub: "Mejor opción",
    monthlySub: "Suscripción mensual flexible",
    recommended: "RECOMENDADO",
    continue: "Continuar con Premium",
    pending: "Configuración de pago pendiente",
    processing: "Compra en curso…",
    restore: "Restaurar compras",
    setup: "Los precios locales aparecen al conectar los productos de la tienda.",
    legal: "La suscripción se renueva automáticamente y se gestiona desde tu cuenta de la tienda. Los precios y condiciones se muestran antes de comprar.",
  },
  ja: {
    title: "7日間の無料体験が終了しました。",
    sub: "健康履歴、リマインダー、AIツール、PetVitalsのすべての機能を引き続き利用するにはPremiumを有効にしてください。",
    benefits: ["すべてのペットと健康記録", "ワクチンと投薬のリマインダー", "AI Health Assistantと書類スキャン", "健康パスポート、共有、健康傾向", "周辺の動物病院とPetVitals Life"],
    annual: "年間Premium", monthly: "月間Premium", annualSub: "最もお得なプラン", monthlySub: "柔軟な月額プラン", recommended: "おすすめ",
    continue: "Premiumを続ける", pending: "決済設定を準備中", processing: "ストアで購入処理中…", restore: "購入を復元",
    setup: "ストア商品を接続すると、現地価格と購入機能が表示されます。", legal: "サブスクリプションは自動更新され、ストアアカウントで管理されます。購入前に価格と更新条件が表示されます。",
  },
} as const;

export function SubscriptionGate() {
  const { language } = usePreferences();
  const {
    billingAvailable,
    billingBusy,
    billingError,
    prices,
    purchase,
    restore,
  } = useSubscription();
  const c = copy[language];
  const [selectedPlan, setSelectedPlan] =
    useState<BillingPlanId>("annual");

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PETVITALS PREMIUM</Text>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.sub}>{c.sub}</Text>
        <View style={styles.benefits}>
          {c.benefits.map((item) => (
            <Text key={item} style={styles.benefit}>
              ✓ {item}
            </Text>
          ))}
        </View>
        {(["annual", "monthly"] as const).map((id) => {
          const selected = selectedPlan === id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={id}
              onPress={() => setSelectedPlan(id)}
              style={[styles.plan, selected && styles.planSelected]}
            >
              <View style={styles.radio}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <View style={styles.planCopy}>
                <View style={styles.row}>
                  <Text style={styles.planTitle}>
                    {id === "annual" ? c.annual : c.monthly}
                  </Text>
                  {id === "annual" ? (
                    <Text style={styles.badge}>{c.recommended}</Text>
                  ) : null}
                </View>
                <Text style={styles.planSubtitle}>
                  {id === "annual" ? c.annualSub : c.monthlySub}
                </Text>
              </View>
              {prices[id] ? (
                <Text style={styles.price}>{prices[id]}</Text>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          disabled={!billingAvailable || billingBusy}
          onPress={() => void purchase(selectedPlan)}
          style={[
            styles.cta,
            (!billingAvailable || billingBusy) && styles.disabled,
          ]}
        >
          {billingBusy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaText}>
              {billingAvailable ? c.continue : c.pending}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!billingAvailable || billingBusy}
          onPress={() => void restore()}
          style={styles.restore}
        >
          <Text
            style={[
              styles.restoreText,
              (!billingAvailable || billingBusy) && styles.restoreDisabled,
            ]}
          >
            {billingBusy ? c.processing : c.restore}
          </Text>
        </Pressable>
        {billingError ? <Text style={styles.error}>{billingError}</Text> : null}
        {!billingAvailable ? <Text style={styles.setup}>{c.setup}</Text> : null}
        <Text style={styles.legal}>{c.legal}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 22 },
  card: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 26, borderWidth: 1, maxWidth: 560, padding: 22, width: "100%" },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", lineHeight: 34, marginTop: 7 },
  sub: { color: colors.muted, lineHeight: 21, marginTop: 10 },
  benefits: { backgroundColor: colors.background, borderRadius: 16, gap: 8, marginTop: 18, padding: 14 },
  benefit: { color: colors.text, fontSize: 13, fontWeight: "700" },
  plan: { alignItems: "center", borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 10, padding: 14 },
  planSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  radio: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: "center", width: 20 },
  radioInner: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 },
  planCopy: { flex: 1 },
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  planTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  planSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  price: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  badge: { backgroundColor: "#FFF4E8", borderRadius: 8, color: colors.accent, fontSize: 9, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 3 },
  cta: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 15, justifyContent: "center", marginTop: 17, minHeight: 54 },
  disabled: { opacity: 0.55 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  restore: { alignItems: "center", paddingVertical: 14 },
  restoreText: { color: colors.primaryDark, fontWeight: "800" },
  restoreDisabled: { color: colors.muted },
  error: { color: colors.danger, fontSize: 11, fontWeight: "700", lineHeight: 16, textAlign: "center" },
  setup: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  legal: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8, textAlign: "center" },
});
