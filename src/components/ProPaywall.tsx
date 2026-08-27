import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, shadow } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
import { useSubscription } from "../context/SubscriptionContext";
const copy = {
  tr: {
    active: "PetVitals Premium aktif",
    activeText:
      "AI, gelişmiş analiz ve premium paylaşım özelliklerine erişiminiz açık.",
    close: "Kapat",
    title: "Daha akıllı sağlık takibi.",
    benefits: [
      "AI Health Assistant",
      "Belge ve aşı karnesi tarama",
      "Gelişmiş Health Score ve trendler",
      "Aile, bakıcı ve veteriner paylaşımı",
      "Gelişmiş Health Passport ve Lost Mode",
    ],
    annual: "Yıllık Premium",
    monthly: "Aylık Premium",
    annualSub: "En avantajlı plan",
    monthlySub: "Esnek aylık abonelik",
    recommended: "ÖNERİLEN",
    goAnnual: "Yıllık Premium’a geç",
    goMonthly: "Aylık Premium’a geç",
    pending: "Ödeme kurulumu bekleniyor",
    restore: "Satın alımları geri yükle",
    setup: "Mağaza ürünleri bağlandığında gerçek satın alma açılır.",
    legal:
      "Abonelik mağaza hesabınız üzerinden yönetilir. Satın alma öncesinde yerel fiyat ve yenileme koşulları gösterilir.",
  },
  en: {
    active: "PetVitals Premium active",
    activeText:
      "You have access to AI, advanced analytics and premium sharing features.",
    close: "Close",
    title: "Smarter health tracking.",
    benefits: [
      "AI Health Assistant",
      "Document and vaccine-card scanning",
      "Advanced Health Score and trends",
      "Family, caregiver and veterinarian sharing",
      "Advanced Health Passport and Lost Mode",
    ],
    annual: "Annual Premium",
    monthly: "Monthly Premium",
    annualSub: "Best value",
    monthlySub: "Flexible monthly subscription",
    recommended: "RECOMMENDED",
    goAnnual: "Choose Annual Premium",
    goMonthly: "Choose Monthly Premium",
    pending: "Payment setup pending",
    restore: "Restore purchases",
    setup: "Real purchases will be enabled when store products are connected.",
    legal:
      "Your subscription is managed through your store account. Local pricing and renewal terms are shown before purchase.",
  },
  de: {
    active: "PetVitals Premium aktiv",
    activeText: "AI, erweiterte Analysen und Premium-Freigaben sind verfügbar.",
    close: "Schließen",
    title: "Intelligentere Gesundheitsüberwachung.",
    benefits: [
      "AI Health Assistant",
      "Dokument- und Impfpass-Scan",
      "Erweiterter Health Score und Trends",
      "Freigabe für Familie, Betreuer und Tierarzt",
      "Erweiterter Health Passport und Lost Mode",
    ],
    annual: "Premium jährlich",
    monthly: "Premium monatlich",
    annualSub: "Bestes Angebot",
    monthlySub: "Flexible monatliche Mitgliedschaft",
    recommended: "EMPFOHLEN",
    goAnnual: "Jährliches Premium wählen",
    goMonthly: "Monatliches Premium wählen",
    pending: "Zahlungseinrichtung ausstehend",
    restore: "Käufe wiederherstellen",
    setup:
      "Echte Käufe werden aktiviert, sobald die Store-Produkte verbunden sind.",
    legal:
      "Das Abonnement wird über Ihr Store-Konto verwaltet. Lokale Preise und Verlängerungsbedingungen werden vor dem Kauf angezeigt.",
  },
  es: {
    active: "PetVitals Premium activo",
    activeText:
      "Tienes acceso a IA, análisis avanzados y funciones premium para compartir.",
    close: "Cerrar",
    title: "Seguimiento de salud más inteligente.",
    benefits: [
      "AI Health Assistant",
      "Escaneo de documentos y cartillas de vacunas",
      "Health Score y tendencias avanzadas",
      "Compartir con familia, cuidadores y veterinarios",
      "Health Passport avanzado y Lost Mode",
    ],
    annual: "Premium anual",
    monthly: "Premium mensual",
    annualSub: "Mejor opción",
    monthlySub: "Suscripción mensual flexible",
    recommended: "RECOMENDADO",
    goAnnual: "Elegir Premium anual",
    goMonthly: "Elegir Premium mensual",
    pending: "Configuración de pago pendiente",
    restore: "Restaurar compras",
    setup:
      "Las compras reales se habilitarán cuando se conecten los productos de la tienda.",
    legal:
      "La suscripción se gestiona desde tu cuenta de la tienda. Los precios locales y condiciones de renovación se muestran antes de comprar.",
  },
  ja: {
    active: "PetVitals Premiumは有効です", activeText: "AI、高度な分析、Premium共有機能を利用できます。", close: "閉じる", title: "よりスマートな健康管理。",
    benefits: ["AI Health Assistant", "書類・ワクチン証明書のスキャン", "高度なHealth Scoreと傾向分析", "家族・ケア担当者・獣医師との共有", "高度な健康パスポートと迷子モード"],
    annual: "年間Premium", monthly: "月間Premium", annualSub: "最もお得なプラン", monthlySub: "柔軟な月額プラン", recommended: "おすすめ",
    goAnnual: "年間Premiumを選択", goMonthly: "月間Premiumを選択", pending: "決済設定を準備中", restore: "購入を復元",
    setup: "ストア商品を接続すると実際の購入が有効になります。", legal: "サブスクリプションはストアアカウントで管理されます。購入前に価格と更新条件が表示されます。",
  },
} as const;
export function ProPaywall({
  active,
  onClose,
}: {
  active: boolean;
  onClose: () => void;
}) {
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
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">(
    "annual",
  );
  if (active)
    return (
      <View style={styles.activeCard}>
        <Text style={styles.activeIcon}>★</Text>
        <Text style={styles.activeTitle}>{c.active}</Text>
        <Text style={styles.activeText}>{c.activeText}</Text>
        <Pressable onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{c.close}</Text>
        </Pressable>
      </View>
    );
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PETVITALS PREMIUM</Text>
          <Text style={styles.title}>{c.title}</Text>
        </View>
        <Pressable accessibilityLabel={c.close} onPress={onClose}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <View style={styles.benefits}>
        {c.benefits.map((x) => (
          <Text key={x} style={styles.benefit}>
            ✓ {x}
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
            <View style={{ flex: 1 }}>
              <View style={styles.planTitleRow}>
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
            {prices[id] ? <Text style={styles.price}>{prices[id]}</Text> : null}
          </Pressable>
        );
      })}
      <Pressable
        disabled={!billingAvailable || billingBusy}
        onPress={() => void purchase(selectedPlan)}
        style={[
          styles.primaryButton,
          (!billingAvailable || billingBusy) && styles.disabled,
        ]}
      >
        {billingBusy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {billingAvailable
              ? selectedPlan === "annual"
                ? c.goAnnual
                : c.goMonthly
              : c.pending}
          </Text>
        )}
      </Pressable>
      <Pressable
        disabled={!billingAvailable || billingBusy}
        onPress={() => void restore()}
        style={styles.restoreButton}
      >
        <Text
          style={[
            styles.restoreText,
            (!billingAvailable || billingBusy) && styles.restoreDisabled,
          ]}
        >
          {c.restore}
        </Text>
      </Pressable>
      {billingError ? <Text style={styles.error}>{billingError}</Text> : null}
      {!billingAvailable ? <Text style={styles.setup}>{c.setup}</Text> : null}
      <Text style={styles.legal}>{c.legal}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 5 },
  close: { color: colors.muted, fontSize: 30, lineHeight: 30 },
  benefits: {
    backgroundColor: colors.background,
    borderRadius: 16,
    gap: 8,
    marginTop: 16,
    padding: 14,
  },
  benefit: { color: colors.text, fontSize: 13, fontWeight: "700" },
  plan: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 14,
  },
  planSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  radio: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioInner: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  planTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  planSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  price: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  badge: {
    backgroundColor: "#FFF4E8",
    borderRadius: 8,
    color: colors.accent,
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 15,
    marginTop: 16,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.55 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  restoreButton: { alignItems: "center", paddingVertical: 14 },
  restoreText: { color: colors.primaryDark, fontWeight: "800" },
  restoreDisabled: { color: colors.muted },
  error: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  setup: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  legal: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
    textAlign: "center",
  },
  activeCard: {
    ...shadow,
    alignItems: "center",
    backgroundColor: "#EEF7F4",
    borderRadius: 24,
    marginTop: 18,
    padding: 22,
  },
  activeIcon: { fontSize: 34 },
  activeTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  activeText: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 7,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: "800" },
});
