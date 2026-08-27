import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AIAssistantPanel } from "../components/AIAssistantPanel";
import { ClinicalCareSuite } from "../components/ClinicalCareSuite";
import { DocumentScannerPanel } from "../components/DocumentScannerPanel";
import { ProPaywall } from "../components/ProPaywall";
import { VerificationCenter } from "../components/VerificationCenter";
import { calculateHealthScore } from "../lib/healthScore";
import {
  addLifeEntry,
  addWeightEntry,
  createPassportShare,
  invitePetMember,
  loadPlatformSnapshot,
  revokePassportShare,
  setPassportLostMode,
  type PetLifeEntryType,
  type PlatformSnapshot,
} from "../lib/platformData";
import type { HealthRecord, Pet, PetMemberRole } from "../types";
import { colors, shadow } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
import { useSubscription } from "../context/SubscriptionContext";
import { formatWeight } from "../lib/globalization";
import { createAndSharePassportPdf } from "../lib/passportPdf";
type FeatureCardProps = {
  icon: string;
  title: string;
  text: string;
  badge?: string;
  status?: string;
  onPress?: () => void;
};
function FeatureCard(p: FeatureCardProps) {
  return (
    <Pressable onPress={p.onPress} style={styles.card}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{p.icon}</Text>
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{p.title}</Text>
          {p.badge ? <Text style={styles.badge}>{p.badge}</Text> : null}
        </View>
        <Text style={styles.cardText}>{p.text}</Text>
        {p.status ? <Text style={styles.cardStatus}>{p.status}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
const emptySnapshot: PlatformSnapshot = {
  weights: [],
  lifeEntries: [],
  memberCount: 0,
  activePassportCount: 0,
  passports: [],
  pro: { plan: "free" },
};
type ToolPanel = "assistant" | "scanner" | null;
type ActionPanel = "weight" | "life" | "member" | "passport" | null;
const C = {
  tr: {
    title: "Dostunuzun tüm sağlık hayatı tek yerde.",
    sub: "Sağlık skoru, paylaşım, pasaport, AI ve günlük yaşam araçları.",
    waiting: "Kayıt bekleniyor",
    smart: "Akıllı araçlar",
    assistant:
      "Kayıtları özetler, veteriner ziyaretine hazırlanmanıza yardım eder. Tanı koymaz.",
    scanner:
      "Aşı karnesi ve veteriner belgelerinden alanları çıkarıp onayınıza sunar.",
    passport:
      "Aşı, alerji ve ilaçları süreli ve iptal edilebilir erişimle paylaşın.",
    care: "Aile, bakıcı ve veteriner için kontrollü erişim oluşturun.",
    life: "Mama, su, aktivite, uyku, bakım ve ruh hali kayıtlarını sağlık hafızasına ekleyin.",
    trends:
      "Zaman içindeki kilo ve sağlık değişimlerini tek bakışta takip edin.",
    pro: "Gelişmiş AI, paylaşım ve analiz özellikleri için premium abonelik.",
    proOpen: "Pro ile açılır",
    proActive: "Pro erişimi aktif",
    ready: "Kullanıma hazır",
    activeShare: "aktif paylaşım",
    activeAccess: "aktif erişim",
    recent: "yakın dönem kaydı",
    noWeight: "Henüz kilo geçmişi yok",
    free: "Free plan",
    active: "Aktif",
    weight: "Kilo kaydı",
    save: "Kaydet",
    saving: "Kaydediliyor…",
    value: "Değer (örn. 45 veya mutlu)",
    unit: "Birim (dk, ml, saat...)",
    note: "Not",
    addLife: "Life kaydını ekle",
    partner: "Eş / ortak sahip",
    caregiver: "Bakıcı/Aile",
    vet: "Veteriner",
    viewer: "Sadece görüntüle",
    email: "E-posta adresi",
    invite: "Erişim daveti oluştur",
    preparing: "Hazırlanıyor…",
    createPassport: "Pasaport oluştur",
    createLost: "Lost Mode oluştur",
    sharePdf: "PDF olarak paylaş",
    lostOn: "Lost aç",
    lostOff: "Lost kapat",
    cancel: "İptal",
    privacy:
      "AI istekleri kimliği doğrulanmış sunucu fonksiyonundan yapılır. Gizli AI anahtarları mobil uygulamada tutulmaz ve belge sonuçları siz onaylamadan sağlık kaydına dönüşmez.",
    loadFail: "PetVitals+ verileri şu anda yüklenemedi.",
    account: "Gerçek hesap gerekli",
    accountText: "Bu işlem demo modunda kullanılamaz.",
  },
  en: {
    title: "Your pet's entire health life in one place.",
    sub: "Health score, sharing, passport, AI and daily life tools.",
    waiting: "Waiting for records",
    smart: "Smart tools",
    assistant:
      "Summarizes records and helps you prepare for vet visits. It does not diagnose.",
    scanner:
      "Extracts fields from vaccine cards and veterinary documents for your approval.",
    passport:
      "Share vaccines, allergies and medications with time-limited, revocable access.",
    care: "Create controlled access for family, caregivers and veterinarians.",
    life: "Add food, water, activity, sleep, grooming and mood logs to the health memory.",
    trends: "Track weight and health changes over time at a glance.",
    pro: "Premium subscription for advanced AI, sharing and analytics.",
    proOpen: "Unlocks with Pro",
    proActive: "Pro access active",
    ready: "Ready to use",
    activeShare: "active shares",
    activeAccess: "active access",
    recent: "recent entries",
    noWeight: "No weight history yet",
    free: "Free plan",
    active: "Active",
    weight: "Weight entry",
    save: "Save",
    saving: "Saving…",
    value: "Value (e.g. 45 or happy)",
    unit: "Unit (min, ml, hours...)",
    note: "Note",
    addLife: "Add Life entry",
    partner: "Partner / co-owner",
    caregiver: "Caregiver/Family",
    vet: "Veterinarian",
    viewer: "View only",
    email: "Email address",
    invite: "Create access invite",
    preparing: "Preparing…",
    createPassport: "Create passport",
    createLost: "Create Lost Mode",
    sharePdf: "Share as PDF",
    lostOn: "Turn Lost on",
    lostOff: "Turn Lost off",
    cancel: "Revoke",
    privacy:
      "AI requests run through authenticated server functions. Secret AI keys are not stored in the mobile app, and document results never become health records without your approval.",
    loadFail: "PetVitals+ data could not be loaded.",
    account: "Account required",
    accountText: "This action is unavailable in demo mode.",
  },
  de: {
    title: "Das gesamte Gesundheitsleben Ihres Tieres an einem Ort.",
    sub: "Gesundheitsscore, Freigabe, Pass, AI und Alltagstools.",
    waiting: "Warte auf Einträge",
    smart: "Intelligente Werkzeuge",
    assistant:
      "Fasst Daten zusammen und hilft bei der Vorbereitung auf Tierarztbesuche. Keine Diagnose.",
    scanner:
      "Liest Felder aus Impfpässen und Tierarztdokumenten zur Bestätigung aus.",
    passport:
      "Impfungen, Allergien und Medikamente zeitlich begrenzt und widerrufbar teilen.",
    care: "Kontrollierten Zugang für Familie, Betreuer und Tierärzte erstellen.",
    life: "Futter, Wasser, Aktivität, Schlaf, Pflege und Stimmung zur Gesundheitshistorie hinzufügen.",
    trends: "Gewichts- und Gesundheitsänderungen im Zeitverlauf verfolgen.",
    pro: "Premium-Abo für erweiterte AI-, Freigabe- und Analysefunktionen.",
    proOpen: "Mit Pro freischalten",
    proActive: "Pro-Zugang aktiv",
    ready: "Einsatzbereit",
    activeShare: "aktive Freigaben",
    activeAccess: "aktive Zugänge",
    recent: "aktuelle Einträge",
    noWeight: "Noch kein Gewichtsverlauf",
    free: "Kostenloser Plan",
    active: "Aktiv",
    weight: "Gewichtseintrag",
    save: "Speichern",
    saving: "Speichern…",
    value: "Wert (z. B. 45 oder glücklich)",
    unit: "Einheit (Min, ml, Stunden...)",
    note: "Notiz",
    addLife: "Life-Eintrag hinzufügen",
    partner: "Partner/Mitbesitzer",
    caregiver: "Betreuer/Familie",
    vet: "Tierarzt",
    viewer: "Nur ansehen",
    email: "E-Mail-Adresse",
    invite: "Zugriffseinladung erstellen",
    preparing: "Vorbereiten…",
    createPassport: "Pass erstellen",
    createLost: "Lost Mode erstellen",
    sharePdf: "Als PDF teilen",
    lostOn: "Lost aktivieren",
    lostOff: "Lost deaktivieren",
    cancel: "Widerrufen",
    privacy:
      "AI-Anfragen laufen über authentifizierte Serverfunktionen. Geheime AI-Schlüssel werden nicht in der App gespeichert; Dokumentergebnisse werden erst nach Ihrer Bestätigung zu Gesundheitsdaten.",
    loadFail: "PetVitals+-Daten konnten nicht geladen werden.",
    account: "Konto erforderlich",
    accountText: "Diese Aktion ist im Demo-Modus nicht verfügbar.",
  },
  es: {
    title: "Toda la vida de salud de tu mascota en un solo lugar.",
    sub: "Puntuación de salud, compartir, pasaporte, AI y herramientas diarias.",
    waiting: "Esperando registros",
    smart: "Herramientas inteligentes",
    assistant:
      "Resume registros y ayuda a preparar visitas al veterinario. No diagnostica.",
    scanner:
      "Extrae campos de cartillas de vacunas y documentos veterinarios para que los confirmes.",
    passport:
      "Comparte vacunas, alergias y medicamentos con acceso temporal y revocable.",
    care: "Crea acceso controlado para familia, cuidadores y veterinarios.",
    life: "Añade comida, agua, actividad, sueño, cuidados y ánimo a la memoria de salud.",
    trends: "Sigue cambios de peso y salud a lo largo del tiempo.",
    pro: "Suscripción premium para AI, compartir y análisis avanzados.",
    proOpen: "Se desbloquea con Pro",
    proActive: "Acceso Pro activo",
    ready: "Listo para usar",
    activeShare: "accesos compartidos activos",
    activeAccess: "accesos activos",
    recent: "registros recientes",
    noWeight: "Aún no hay historial de peso",
    free: "Plan gratuito",
    active: "Activo",
    weight: "Registro de peso",
    save: "Guardar",
    saving: "Guardando…",
    value: "Valor (ej. 45 o feliz)",
    unit: "Unidad (min, ml, horas...)",
    note: "Nota",
    addLife: "Añadir registro Life",
    partner: "Pareja/copropietario",
    caregiver: "Cuidador/Familia",
    vet: "Veterinario",
    viewer: "Solo ver",
    email: "Correo electrónico",
    invite: "Crear invitación de acceso",
    preparing: "Preparando…",
    createPassport: "Crear pasaporte",
    createLost: "Crear Lost Mode",
    sharePdf: "Compartir como PDF",
    lostOn: "Activar Lost",
    lostOff: "Desactivar Lost",
    cancel: "Revocar",
    privacy:
      "Las solicitudes de AI pasan por funciones de servidor autenticadas. Las claves secretas no se guardan en la app y los resultados de documentos no se convierten en registros sin tu aprobación.",
    loadFail: "No se pudieron cargar los datos de PetVitals+.",
    account: "Se requiere una cuenta",
    accountText: "Esta acción no está disponible en modo demo.",
  },
  ja: {
    title: "ペットの健康をすべて一か所に。",
    sub: "健康スコア、共有、パスポート、AI、日々の生活ツール。",
    waiting: "記録を待っています",
    smart: "スマートツール",
    assistant: "記録を要約し、診察の準備を支援します。診断は行いません。",
    scanner:
      "ワクチン証明書や診療書類から項目を抽出し、確認できる状態にします。",
    passport:
      "ワクチン、アレルギー、薬を期限付き・取り消し可能なアクセスで共有します。",
    care: "家族、ケア担当者、獣医師に権限を限定して共有します。",
    life: "食事、水分、活動、睡眠、ケア、気分を健康履歴に追加します。",
    trends: "体重と健康状態の変化を時系列で確認します。",
    pro: "高度なAI、共有、分析機能のPremiumプラン。",
    proOpen: "Proで利用可能",
    proActive: "Proアクセス有効",
    ready: "利用可能",
    activeShare: "件の有効な共有",
    activeAccess: "件の有効なアクセス",
    recent: "件の最近の記録",
    noWeight: "体重履歴はまだありません",
    free: "無料プラン",
    active: "有効",
    weight: "体重記録",
    save: "保存",
    saving: "保存中…",
    value: "値（例：45、元気）",
    unit: "単位（分、ml、時間など）",
    note: "メモ",
    addLife: "生活記録を追加",
    partner: "パートナー / 共同飼い主",
    caregiver: "ケア担当者 / 家族",
    vet: "獣医師",
    viewer: "閲覧のみ",
    email: "メールアドレス",
    invite: "アクセス招待を作成",
    preparing: "準備中…",
    createPassport: "パスポートを作成",
    createLost: "迷子モードを作成",
    sharePdf: "PDFで共有",
    lostOn: "迷子モードを有効化",
    lostOff: "迷子モードを無効化",
    cancel: "取り消す",
    privacy:
      "AIリクエストは認証済みのサーバー機能を通じて処理されます。秘密のAIキーはアプリに保存されず、書類の結果は承認するまで健康記録になりません。",
    loadFail: "PetVitals+のデータを読み込めませんでした。",
    account: "アカウントが必要です",
    accountText: "この操作はデモモードでは利用できません。",
  },
} as const;
const lifeKeys: PetLifeEntryType[] = [
  "food",
  "water",
  "activity",
  "sleep",
  "grooming",
  "parasite",
  "mood",
  "custom",
];
const lifeLabels = {
  tr: [
    "Mama",
    "Su",
    "Aktivite",
    "Uyku",
    "Bakım",
    "Parazit",
    "Ruh hali",
    "Diğer",
  ],
  en: [
    "Food",
    "Water",
    "Activity",
    "Sleep",
    "Grooming",
    "Parasite",
    "Mood",
    "Other",
  ],
  de: [
    "Futter",
    "Wasser",
    "Aktivität",
    "Schlaf",
    "Pflege",
    "Parasit",
    "Stimmung",
    "Andere",
  ],
  es: [
    "Comida",
    "Agua",
    "Actividad",
    "Sueño",
    "Cuidado",
    "Parásito",
    "Ánimo",
    "Otro",
  ],
  ja: ["食事", "水分", "活動", "睡眠", "ケア", "寄生虫予防", "気分", "その他"],
} as const;
export function PlatformScreen({
  pets,
  records,
  userId,
  demoMode,
}: {
  pets: Pet[];
  records: HealthRecord[];
  userId?: string;
  demoMode: boolean;
}) {
  const { language, unitSystem } = usePreferences();
  const { accessState } = useSubscription();
  const c = C[language];
  const lifeTypes = lifeKeys.map((key, i) => ({
    key,
    label: lifeLabels[language][i],
  }));
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id);
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null);
  const [weightValue, setWeightValue] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<PetMemberRole>("caregiver");
  const [lifeType, setLifeType] = useState<PetLifeEntryType>("activity");
  const [lifeValue, setLifeValue] = useState("");
  const [lifeUnit, setLifeUnit] = useState("");
  const [lifeNotes, setLifeNotes] = useState("");
  const [lastPassportUrl, setLastPassportUrl] = useState<string>();
  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pets[0];
  const score = useMemo(
    () =>
      selectedPet
        ? calculateHealthScore(selectedPet, records, snapshot.weights)
        : null,
    [records, selectedPet, snapshot.weights],
  );
  async function refresh() {
    if (!selectedPet || !userId || demoMode) {
      setSnapshot(emptySnapshot);
      return;
    }
    setLoading(true);
    try {
      setSnapshot(await loadPlatformSnapshot(userId, selectedPet.id));
      setLoadError(null);
    } catch {
      setLoadError(c.loadFail);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setToolPanel(null);
    setActionPanel(null);
    void refresh();
  }, [demoMode, selectedPet?.id, userId, language]);
  const last = snapshot.weights.at(-1),
    prev = snapshot.weights.at(-2);
  const weightTrend =
    last && prev
      ? `${last.weight > prev.weight ? "↑" : last.weight < prev.weight ? "↓" : "→"} ${formatWeight(last.weight, unitSystem, language)}`
      : last
        ? formatWeight(last.weight, unitSystem, language)
        : c.noWeight;
  const proActive = accessState === "trial" || accessState === "subscribed";
  const proSubscribed = accessState === "subscribed";
  const openProTool = (p: Exclude<ToolPanel, null>) => {
    if (!proActive) {
      setShowPaywall(true);
      return;
    }
    setShowPaywall(false);
    setToolPanel(p);
    setActionPanel(null);
  };
  function requireLiveAccount() {
    if (!userId || demoMode || !selectedPet) {
      Alert.alert(c.account, c.accountText);
      return false;
    }
    return true;
  }
  async function saveWeight() {
    if (!requireLiveAccount() || !selectedPet || !userId) return;
    setBusy(true);
    try {
      await addWeightEntry(
        userId,
        selectedPet.id,
        Number(weightValue.replace(",", ".")),
      );
      setWeightValue("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function saveLifeEntry() {
    if (!requireLiveAccount() || !selectedPet || !userId) return;
    const n = lifeValue.trim()
      ? Number(lifeValue.replace(",", "."))
      : undefined;
    setBusy(true);
    try {
      await addLifeEntry(userId, selectedPet.id, {
        entryType: lifeType,
        valueNumeric: Number.isFinite(n) ? n : undefined,
        valueText: !Number.isFinite(n) ? lifeValue : undefined,
        unit: lifeUnit,
        notes: lifeNotes,
      });
      setLifeValue("");
      setLifeUnit("");
      setLifeNotes("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function saveMember() {
    if (!requireLiveAccount() || !selectedPet || !userId) return;
    setBusy(true);
    try {
      await invitePetMember(userId, selectedPet.id, memberEmail, memberRole);
      setMemberEmail("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function createPassport(lost = false) {
    if (!requireLiveAccount() || !selectedPet) return;
    setBusy(true);
    try {
      const r = await createPassportShare(selectedPet.id, lost, language);
      setLastPassportUrl(r.url);
      await refresh();
      await Share.share({
        message: `PetVitals Health Passport — ${selectedPet.name}\n${r.url}`,
      });
    } finally {
      setBusy(false);
    }
  }
  async function sharePassportPdf() {
    if (!selectedPet) return;
    setBusy(true);
    try {
      await createAndSharePassportPdf({
        pet: selectedPet,
        records,
        publicUrl: lastPassportUrl,
        language,
      });
    } finally {
      setBusy(false);
    }
  }
  async function toggleLostMode(id: string, enabled: boolean) {
    if (!userId) return;
    setBusy(true);
    try {
      await setPassportLostMode(userId, id, enabled);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function revokePassport(id: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await revokePassportShare(userId, id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PETVITALS PLATFORM</Text>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.sub}>{c.sub}</Text>
      {pets.length > 1 ? (
        <View style={styles.petPicker}>
          {pets.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelectedPetId(p.id)}
              style={[
                styles.petChip,
                selectedPet?.id === p.id && styles.petChipActive,
              ]}
            >
              <Text
                style={[
                  styles.petChipText,
                  selectedPet?.id === p.id && styles.petChipTextActive,
                ]}
              >
                {p.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.scoreCard}>
        <View>
          <Text style={styles.scoreLabel}>
            {selectedPet?.name ?? ""} Health Score
          </Text>
          <Text style={styles.scoreMeta}>{score?.label ?? c.waiting}</Text>
        </View>
        <View style={styles.scoreBubble}>
          <Text style={styles.scoreValue}>{score?.score ?? "—"}</Text>
        </View>
      </View>
      {score?.reasons.slice(0, 2).map((r) => (
        <Text key={r} style={styles.reason}>
          • {r}
        </Text>
      ))}
      {selectedPet ? (
        <ClinicalCareSuite
          demoMode={demoMode}
          pet={selectedPet}
          userId={userId}
        />
      ) : null}
      {selectedPet && userId && !demoMode ? (
        <VerificationCenter pet={selectedPet} userId={userId} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      {showPaywall ? (
        <ProPaywall
          active={proSubscribed}
          onClose={() => setShowPaywall(false)}
        />
      ) : null}
      {selectedPet && toolPanel === "assistant" ? (
        <AIAssistantPanel
          pet={selectedPet}
          onClose={() => setToolPanel(null)}
        />
      ) : null}
      {selectedPet && toolPanel === "scanner" ? (
        <DocumentScannerPanel
          pet={selectedPet}
          onClose={() => setToolPanel(null)}
          onConfirmed={refresh}
        />
      ) : null}
      {actionPanel === "weight" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>{c.weight}</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder={
              unitSystem === "imperial" ? "e.g. 18.5 lb" : "e.g. 8.4 kg"
            }
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={weightValue}
            onChangeText={setWeightValue}
          />
          <Pressable
            disabled={busy}
            onPress={saveWeight}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? c.saving : c.save}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {actionPanel === "life" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>PetVitals Life</Text>
          <View style={styles.chips}>
            {lifeTypes.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setLifeType(t.key)}
                style={[
                  styles.smallChip,
                  lifeType === t.key && styles.smallChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.smallChipText,
                    lifeType === t.key && styles.smallChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            placeholder={c.value}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={lifeValue}
            onChangeText={setLifeValue}
          />
          <TextInput
            placeholder={c.unit}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={lifeUnit}
            onChangeText={setLifeUnit}
          />
          <TextInput
            multiline
            placeholder={c.note}
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline]}
            value={lifeNotes}
            onChangeText={setLifeNotes}
          />
          <Pressable
            disabled={busy}
            onPress={saveLifeEntry}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? c.saving : c.addLife}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {actionPanel === "member" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Care Network</Text>
          <View style={styles.chips}>
            {(
              [
                "partner",
                "caregiver",
                "veterinarian",
                "viewer",
              ] as PetMemberRole[]
            ).map((role) => (
              <Pressable
                key={role}
                onPress={() => setMemberRole(role)}
                style={[
                  styles.smallChip,
                  memberRole === role && styles.smallChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.smallChipText,
                    memberRole === role && styles.smallChipTextActive,
                  ]}
                >
                  {role === "partner"
                    ? c.partner
                    : role === "caregiver"
                      ? c.caregiver
                      : role === "veterinarian"
                        ? c.vet
                        : c.viewer}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={c.email}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={memberEmail}
            onChangeText={setMemberEmail}
          />
          <Pressable
            disabled={busy}
            onPress={saveMember}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? c.preparing : c.invite}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {actionPanel === "passport" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Universal Health Passport</Text>
          <View style={styles.buttonRow}>
            <Pressable
              disabled={busy}
              onPress={() => createPassport(false)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{c.createPassport}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => createPassport(true)}
              style={[styles.primaryButton, styles.dangerButton]}
            >
              <Text style={styles.primaryButtonText}>{c.createLost}</Text>
            </Pressable>
          </View>
          <Pressable
            disabled={busy}
            onPress={sharePassportPdf}
            style={[styles.primaryButton, styles.pdfButton]}
          >
            <Text style={styles.primaryButtonText}>{c.sharePdf}</Text>
          </Pressable>
          {snapshot.passports.map((p) => (
            <View key={p.id} style={styles.passportRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.passportTitle}>
                  {p.lostMode ? "⚑ Lost Mode" : "Health Passport"}
                </Text>
                <Text style={styles.passportMeta}>
                  {new Date(p.createdAt).toLocaleDateString(language)}
                </Text>
              </View>
              <Pressable
                disabled={busy}
                onPress={() => toggleLostMode(p.id, !p.lostMode)}
              >
                <Text style={styles.link}>
                  {p.lostMode ? c.lostOff : c.lostOn}
                </Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => revokePassport(p.id)}>
                <Text style={styles.revoke}>{c.cancel}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.section}>{c.smart}</Text>
      <FeatureCard
        icon="✦"
        title="AI Health Assistant"
        text={c.assistant}
        badge="PRO"
        status={proActive ? c.proActive : c.proOpen}
        onPress={() => openProTool("assistant")}
      />
      <FeatureCard
        icon="▣"
        title={
          language === "tr"
            ? "Belge Tarama"
            : language === "en"
              ? "Document Scanner"
              : language === "de"
                ? "Dokumentenscan"
                : language === "es"
                  ? "Escáner de documentos"
                  : "書類スキャン"
        }
        text={c.scanner}
        badge="AI"
        status={proActive ? c.ready : c.proOpen}
        onPress={() => openProTool("scanner")}
      />
      <FeatureCard
        icon="⌁"
        title="Universal Health Passport"
        text={c.passport}
        status={`${snapshot.activePassportCount} ${c.activeShare}`}
        onPress={() =>
          setActionPanel(actionPanel === "passport" ? null : "passport")
        }
      />
      <FeatureCard
        icon="👥"
        title="Care Network"
        text={c.care}
        status={`${snapshot.memberCount} ${c.activeAccess}`}
        onPress={() =>
          setActionPanel(actionPanel === "member" ? null : "member")
        }
      />
      <FeatureCard
        icon="◉"
        title="PetVitals Life"
        text={c.life}
        status={`${snapshot.lifeEntries.length} ${c.recent}`}
        onPress={() => setActionPanel(actionPanel === "life" ? null : "life")}
      />
      <FeatureCard
        icon="↗"
        title={
          language === "tr"
            ? "Kilo & Sağlık Trendleri"
            : language === "en"
              ? "Weight & Health Trends"
              : language === "de"
                ? "Gewichts- & Gesundheitstrends"
                : language === "es"
                  ? "Tendencias de peso y salud"
                  : "体重・健康傾向"
        }
        text={c.trends}
        status={weightTrend}
        onPress={() =>
          setActionPanel(actionPanel === "weight" ? null : "weight")
        }
      />
      <FeatureCard
        icon="★"
        title="PetVitals Pro"
        text={c.pro}
        badge="PRO"
        status={proActive ? c.active : c.free}
        onPress={() => setShowPaywall(true)}
      />
      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>
          {language === "tr"
            ? "Tasarımdan gelen gizlilik"
            : language === "de"
              ? "Datenschutz durch Technikgestaltung"
              : language === "es"
                ? "Privacidad desde el diseño"
                : language === "ja"
                  ? "プライバシーを守る設計"
                  : "Privacy by design"}
        </Text>
        <Text style={styles.privacyText}>{c.privacy}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { padding: 22 },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 7,
  },
  sub: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  petPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  petChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  petChipActive: { backgroundColor: colors.primary },
  petChipText: { color: colors.text, fontWeight: "700" },
  petChipTextActive: { color: colors.white },
  scoreCard: {
    ...shadow,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    padding: 20,
  },
  scoreLabel: { color: colors.white, fontSize: 17, fontWeight: "900" },
  scoreMeta: { color: "#DDEFE8", marginTop: 5 },
  scoreBubble: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  scoreValue: { color: colors.primary, fontSize: 22, fontWeight: "900" },
  reason: { color: colors.muted, fontSize: 12, marginTop: 6 },
  loader: { marginTop: 16 },
  error: { color: colors.danger, fontSize: 12, marginTop: 10 },
  section: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 28,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 11,
    padding: 14,
  },
  cardIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cardIconText: { fontSize: 20 },
  cardCopy: { flex: 1, marginLeft: 12 },
  cardTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  cardText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  cardStatus: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
  },
  badge: {
    backgroundColor: "#FFF4E8",
    borderRadius: 8,
    color: colors.accent,
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  chevron: { color: colors.muted, fontSize: 28, marginLeft: 8 },
  actionBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    marginTop: 11,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  dangerButton: { backgroundColor: colors.danger },
  pdfButton: { backgroundColor: colors.primaryDark },
  buttonRow: { flexDirection: "row", gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  smallChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  smallChipText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  smallChipTextActive: { color: colors.primaryDark },
  passportRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
  },
  passportTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  passportMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  link: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  revoke: { color: colors.danger, fontSize: 11, fontWeight: "800" },
  privacyCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    marginTop: 20,
    padding: 16,
  },
  privacyTitle: { color: colors.primaryDark, fontWeight: "900" },
  privacyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
});
