import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { VaccineForm } from "../components/VaccineForm";
import {
  askPetHealthBrain,
  evaluateSmartHealthAlerts,
  type SmartHealthAlert,
} from "../lib/healthBrain";
import type {
  HealthRecord,
  Pet,
  SaveVaccineResult,
  VaccineDraft,
  VaccineNotificationStatus,
} from "../types";
import { colors } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
import { localizeRecordText } from "../lib/demoLocalization";

const copy = {
  tr: {
    title: "Sağlık takvimi",
    sub: "Kontrol, aşı ve ilaç planı.",
    close: "Kapat",
    add: "＋ Aşı ekle",
    brain:
      "Kayıtlı sağlık geçmişini kullanarak özet çıkarır ve yaklaşan risk işaretlerini görünür hale getirir. Tanı koymaz.",
    check: "Akıllı uyarıları kontrol et",
    none: "Aktif bir akıllı uyarı görünmüyor.",
    ask: "AI Health Brain’e sor",
    question: "sağlık geçmişine soru sor",
    disclaimer:
      "Eğitsel destek sağlar; veteriner tanısı veya tedavisinin yerine geçmez.",
    empty: "Henüz bir sağlık kaydı eklenmemiş.",
    pet: "Dostunuz",
    applied: "Uygulandı",
    vet: "Veteriner",
    scheduled: "🔔 Hatırlatmalar açık",
    denied: "Bildirim izni kapalı",
    failed: "Bildirim kurulamadı",
    future: "Gelecek bildirim yok",
    disabled: "Bildirim kapalı",
    alertError: "Akıllı sağlık uyarıları alınamadı.",
    aiError: "AI Health Brain yanıt veremedi.",
  },
  en: {
    title: "Health schedule",
    sub: "Checkups, vaccines and medication plan.",
    close: "Close",
    add: "＋ Add vaccine",
    brain:
      "Uses recorded health history to summarize care and surface approaching risk signals. It does not diagnose.",
    check: "Check smart alerts",
    none: "No active smart alerts.",
    ask: "Ask AI Health Brain",
    question: "ask about health history",
    disclaimer:
      "Provides educational support; it does not replace veterinary diagnosis or treatment.",
    empty: "No health records yet.",
    pet: "Your pet",
    applied: "Administered",
    vet: "Veterinarian",
    scheduled: "🔔 Reminders on",
    denied: "Notifications denied",
    failed: "Reminder setup failed",
    future: "No upcoming reminder",
    disabled: "Notifications off",
    alertError: "Smart health alerts could not be loaded.",
    aiError: "AI Health Brain could not respond.",
  },
  de: {
    title: "Gesundheitsplan",
    sub: "Kontrollen, Impfungen und Medikamentenplan.",
    close: "Schließen",
    add: "＋ Impfung hinzufügen",
    brain:
      "Nutzt den gespeicherten Gesundheitsverlauf für Zusammenfassungen und mögliche Risikosignale. Stellt keine Diagnose.",
    check: "Intelligente Warnungen prüfen",
    none: "Keine aktiven intelligenten Warnungen.",
    ask: "AI Health Brain fragen",
    question: "zum Gesundheitsverlauf fragen",
    disclaimer:
      "Dient der Information und ersetzt keine tierärztliche Diagnose oder Behandlung.",
    empty: "Noch keine Gesundheitsdaten vorhanden.",
    pet: "Ihr Tier",
    applied: "Verabreicht",
    vet: "Tierarzt",
    scheduled: "🔔 Erinnerungen aktiv",
    denied: "Benachrichtigungen verweigert",
    failed: "Erinnerung fehlgeschlagen",
    future: "Keine kommende Erinnerung",
    disabled: "Benachrichtigungen aus",
    alertError: "Gesundheitswarnungen konnten nicht geladen werden.",
    aiError: "AI Health Brain konnte nicht antworten.",
  },
  es: {
    title: "Calendario de salud",
    sub: "Plan de revisiones, vacunas y medicación.",
    close: "Cerrar",
    add: "＋ Añadir vacuna",
    brain:
      "Usa el historial de salud registrado para resumir y mostrar posibles señales de riesgo. No diagnostica.",
    check: "Revisar alertas inteligentes",
    none: "No hay alertas inteligentes activas.",
    ask: "Preguntar a AI Health Brain",
    question: "preguntar sobre el historial de salud",
    disclaimer:
      "Ofrece apoyo educativo; no sustituye el diagnóstico ni el tratamiento veterinario.",
    empty: "Aún no hay registros de salud.",
    pet: "Tu mascota",
    applied: "Administrada",
    vet: "Veterinario",
    scheduled: "🔔 Recordatorios activos",
    denied: "Notificaciones denegadas",
    failed: "No se pudo crear el aviso",
    future: "Sin próximo aviso",
    disabled: "Notificaciones desactivadas",
    alertError: "No se pudieron cargar las alertas de salud.",
    aiError: "AI Health Brain no pudo responder.",
  },
  ja: {
    title: "健康スケジュール",
    sub: "健診、ワクチン、投薬の予定。",
    close: "閉じる",
    add: "＋ ワクチンを追加",
    brain:
      "登録済みの健康履歴を要約し、注意すべき変化を表示します。診断は行いません。",
    check: "スマートアラートを確認",
    none: "有効なスマートアラートはありません。",
    ask: "AI Health Brainに質問",
    question: "健康履歴について質問",
    disclaimer:
      "情報提供を目的としており、獣医師の診断や治療に代わるものではありません。",
    empty: "健康記録はまだありません。",
    pet: "ペット",
    applied: "接種済み",
    vet: "獣医師",
    scheduled: "🔔 リマインダー有効",
    denied: "通知が許可されていません",
    failed: "リマインダーを設定できませんでした",
    future: "今後のリマインダーはありません",
    disabled: "通知オフ",
    alertError: "健康アラートを読み込めませんでした。",
    aiError: "AI Health Brainから回答を取得できませんでした。",
  },
} as const;

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
  const { language } = usePreferences();
  const c = copy[language];
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? "");
  const [smartAlerts, setSmartAlerts] = useState<SmartHealthAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [question, setQuestion] = useState("");
  const [askingAi, setAskingAi] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [healthBrainError, setHealthBrainError] = useState("");
  const sortedRecords = [...records].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  useEffect(() => {
    if (!pets.some((p) => p.id === selectedPetId))
      setSelectedPetId(pets[0]?.id ?? "");
  }, [pets, selectedPetId]);
  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const localizeDemo = (value?: string) =>
    localizeRecordText(value, language);
  const notificationLabel = (status?: VaccineNotificationStatus) =>
    status === "scheduled"
      ? c.scheduled
      : status === "denied"
        ? c.denied
        : status === "failed"
          ? c.failed
          : status === "no_future_dates"
            ? c.future
            : status === "disabled"
              ? c.disabled
              : null;
  async function handleEvaluateAlerts() {
    if (!selectedPetId) return;
    setLoadingAlerts(true);
    setHealthBrainError("");
    try {
      setSmartAlerts(await evaluateSmartHealthAlerts(selectedPetId, language));
    } catch (e) {
      setHealthBrainError(e instanceof Error ? e.message : c.alertError);
    } finally {
      setLoadingAlerts(false);
    }
  }
  async function handleAskAi() {
    if (!selectedPetId || !question.trim()) return;
    setAskingAi(true);
    setHealthBrainError("");
    setAiAnswer("");
    try {
      const r = await askPetHealthBrain(selectedPetId, question, language);
      setAiAnswer(r.answer);
    } catch (e) {
      setHealthBrainError(e instanceof Error ? e.message : c.aiError);
    } finally {
      setAskingAi(false);
    }
  }
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.sub}>{c.sub}</Text>
        </View>
        <Pressable
          onPress={() => setShowVaccineForm((v) => !v)}
          style={[styles.addButton, showVaccineForm && styles.addButtonActive]}
        >
          <Text
            style={[
              styles.addButtonText,
              showVaccineForm && styles.addButtonTextActive,
            ]}
          >
            {showVaccineForm ? c.close : c.add}
          </Text>
        </Pressable>
      </View>
      {showVaccineForm ? (
        <VaccineForm onSave={onAddVaccine} pets={pets} saving={savingVaccine} />
      ) : null}
      {pets.length > 0 ? (
        <View style={styles.brainCard}>
          <Text style={styles.brainEyebrow}>FAUNVIA AI</Text>
          <Text style={styles.brainTitle}>Health Brain</Text>
          <Text style={styles.brainCopy}>{c.brain}</Text>
          <View style={styles.petPicker}>
            {pets.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setSelectedPetId(p.id);
                  setSmartAlerts([]);
                  setAiAnswer("");
                  setHealthBrainError("");
                }}
                style={[
                  styles.petChip,
                  selectedPetId === p.id && styles.petChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.petChipText,
                    selectedPetId === p.id && styles.petChipTextSelected,
                  ]}
                >
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={loadingAlerts || !selectedPetId}
            onPress={handleEvaluateAlerts}
            style={styles.brainButton}
          >
            {loadingAlerts ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.brainButtonText}>{c.check}</Text>
            )}
          </Pressable>
          {smartAlerts.length === 0 && !loadingAlerts ? (
            <Text style={styles.noAlert}>{c.none}</Text>
          ) : null}
          {smartAlerts.map((a) => (
            <View key={a.id} style={styles.alertCard}>
              <Text style={styles.alertSeverity}>
                {a.severity.toUpperCase()}
              </Text>
              <Text style={styles.alertTitle}>{a.title}</Text>
              <Text style={styles.alertMessage}>{a.message}</Text>
            </View>
          ))}
          <TextInput
            multiline
            onChangeText={setQuestion}
            placeholder={`${selectedPet?.name ?? c.pet}: ${c.question}`}
            placeholderTextColor={colors.muted}
            style={styles.questionInput}
            value={question}
          />
          <Pressable
            disabled={askingAi || !selectedPetId || !question.trim()}
            onPress={handleAskAi}
            style={[styles.brainButton, styles.askButton]}
          >
            {askingAi ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.brainButtonText}>{c.ask}</Text>
            )}
          </Pressable>
          {aiAnswer ? <Text style={styles.aiAnswer}>{aiAnswer}</Text> : null}
          {healthBrainError ? (
            <Text style={styles.brainError}>{healthBrainError}</Text>
          ) : null}
          <Text style={styles.disclaimer}>{c.disclaimer}</Text>
        </View>
      ) : null}
      {sortedRecords.length === 0 ? (
        <Text style={styles.empty}>{c.empty}</Text>
      ) : null}
      {sortedRecords.map((item, index) => {
        const badge =
          item.category === "Aşı"
            ? notificationLabel(item.notificationStatus)
            : null;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.lineWrap}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      item.category === "İlaç" ? colors.accent : colors.primary,
                  },
                ]}
              />
              {index < sortedRecords.length - 1 ? (
                <View style={styles.line} />
              ) : null}
            </View>
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.category}>
                  {localizeDemo(item.category)}
                </Text>
                <Text style={styles.date}>
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                    language,
                    { day: "numeric", month: "short" },
                  )}
                </Text>
              </View>
              <Text style={styles.record}>{localizeDemo(item.title)}</Text>
              {item.vaccineType ? (
                <Text style={styles.vaccineType}>{item.vaccineType}</Text>
              ) : null}
              <Text style={styles.pet}>
                {pets.find((p) => p.id === item.petId)?.name ?? c.pet}
              </Text>
              {item.administeredDate ? (
                <Text style={styles.meta}>
                  {c.applied}:{" "}
                  {new Date(
                    `${item.administeredDate}T00:00:00`,
                  ).toLocaleDateString(language)}
                </Text>
              ) : null}
              {item.veterinarian ? (
                <Text style={styles.meta}>
                  {c.vet}: {item.veterinarian}
                </Text>
              ) : null}
              {badge ? (
                <Text style={styles.notificationBadge}>{badge}</Text>
              ) : null}
              {item.notes ? (
                <Text style={styles.notes}>{localizeDemo(item.notes)}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { padding: 22 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  sub: { color: colors.muted, marginBottom: 25, marginTop: 5 },
  addButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonActive: { backgroundColor: colors.surface },
  addButtonText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  addButtonTextActive: { color: colors.primary },
  brainCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    padding: 18,
  },
  brainEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  brainTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  brainCopy: { color: colors.muted, lineHeight: 20, marginTop: 7 },
  petPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  petChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  petChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  petChipText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  petChipTextSelected: { color: colors.primaryDark },
  brainButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 13,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 44,
    padding: 11,
  },
  askButton: { marginTop: 9 },
  brainButtonText: { color: colors.white, fontSize: 13, fontWeight: "900" },
  noAlert: { color: colors.muted, fontSize: 12, marginTop: 12 },
  alertCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  alertSeverity: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  alertTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  alertMessage: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  questionInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.text,
    marginTop: 16,
    minHeight: 86,
    padding: 12,
    textAlignVertical: "top",
  },
  aiAnswer: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    color: colors.text,
    lineHeight: 20,
    marginTop: 12,
    padding: 12,
  },
  brainError: { color: "#B42318", fontSize: 12, marginTop: 10 },
  disclaimer: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 12,
  },
  empty: { color: colors.muted, textAlign: "center" },
  row: { flexDirection: "row" },
  lineWrap: { alignItems: "center", width: 28 },
  dot: { borderRadius: 7, height: 14, marginTop: 20, width: 14 },
  line: { backgroundColor: colors.border, flex: 1, width: 2 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    marginBottom: 14,
    padding: 17,
  },
  top: { flexDirection: "row", justifyContent: "space-between" },
  category: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  date: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  record: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 8 },
  vaccineType: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  pet: { color: colors.muted, marginTop: 5 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  notificationBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  notes: {
    backgroundColor: colors.background,
    borderRadius: 9,
    color: colors.muted,
    marginTop: 10,
    padding: 9,
  },
});
