import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { FormField } from "./FormField";
import { PrimaryButton } from "./PrimaryButton";
import {
  addMonthsToIsoDate,
  toIsoDate,
  validateVaccineDraft,
} from "../lib/vaccineReminders";
import type { Pet, SaveVaccineResult, VaccineDraft } from "../types";
import { colors } from "../theme";
import { usePreferences } from "../context/PreferencesContext";

const copy = {
  tr: {
    new: "Yeni aşı kaydı",
    select: "Dost seçin",
    name: "Aşı adı *",
    namePh: "Örn. Karma aşı",
    type: "Aşı türü",
    typePh: "Örn. DHPPi",
    given: "Uygulama tarihi *",
    repeat: "Tekrar aralığı (ay)",
    next: "Sonraki aşı tarihi *",
    vet: "Veteriner",
    vetPh: "Veteriner veya klinik adı",
    notes: "Notlar",
    notesPh: "Doz, seri numarası veya özel not",
    auto: "Otomatik hatırlatmalar",
    autoHelp: "30, 7 ve 1 gün önce; ayrıca aşı günü saat 09.00’da.",
    add: "Aşı kaydını ekle",
    first: "Önce bir dost ekleyin",
    firstHelp:
      "Aşı kaydı oluşturmak için Dostlarım bölümünde bir hayvan profili bulunmalı.",
    success: "Aşı kaydı başarıyla eklendi.",
    unexpected: "Aşı kaydı eklenirken beklenmeyen bir hata oluştu.",
  },
  en: {
    new: "New vaccine record",
    select: "Choose pet",
    name: "Vaccine name *",
    namePh: "e.g. Combination vaccine",
    type: "Vaccine type",
    typePh: "e.g. DHPPi",
    given: "Administered date *",
    repeat: "Repeat interval (months)",
    next: "Next due date *",
    vet: "Veterinarian",
    vetPh: "Veterinarian or clinic name",
    notes: "Notes",
    notesPh: "Dose, batch number or special note",
    auto: "Automatic reminders",
    autoHelp: "30, 7 and 1 day before, plus 9:00 AM on the due date.",
    add: "Add vaccine record",
    first: "Add a pet first",
    firstHelp: "A pet profile is required before creating a vaccine record.",
    success: "Vaccine record added successfully.",
    unexpected: "An unexpected error occurred while adding the vaccine.",
  },
  de: {
    new: "Neuer Impfeintrag",
    select: "Tier auswählen",
    name: "Impfstoff *",
    namePh: "z. B. Kombinationsimpfung",
    type: "Impfart",
    typePh: "z. B. DHPPi",
    given: "Verabreicht am *",
    repeat: "Wiederholung (Monate)",
    next: "Nächster Termin *",
    vet: "Tierarzt",
    vetPh: "Tierarzt oder Klinik",
    notes: "Notizen",
    notesPh: "Dosis, Chargennummer oder Hinweis",
    auto: "Automatische Erinnerungen",
    autoHelp: "30, 7 und 1 Tag vorher sowie am Impftag um 09:00 Uhr.",
    add: "Impfeintrag hinzufügen",
    first: "Zuerst ein Tier hinzufügen",
    firstHelp: "Für einen Impfeintrag muss ein Tierprofil vorhanden sein.",
    success: "Impfeintrag erfolgreich hinzugefügt.",
    unexpected:
      "Beim Hinzufügen der Impfung ist ein unerwarteter Fehler aufgetreten.",
  },
  es: {
    new: "Nuevo registro de vacuna",
    select: "Elegir mascota",
    name: "Nombre de vacuna *",
    namePh: "p. ej. Vacuna combinada",
    type: "Tipo de vacuna",
    typePh: "p. ej. DHPPi",
    given: "Fecha de aplicación *",
    repeat: "Intervalo de repetición (meses)",
    next: "Próxima fecha *",
    vet: "Veterinario",
    vetPh: "Veterinario o clínica",
    notes: "Notas",
    notesPh: "Dosis, lote o nota especial",
    auto: "Recordatorios automáticos",
    autoHelp: "30, 7 y 1 día antes, además a las 09:00 el día de la vacuna.",
    add: "Añadir registro de vacuna",
    first: "Añade primero una mascota",
    firstHelp:
      "Se necesita un perfil de mascota para crear un registro de vacuna.",
    success: "Vacuna añadida correctamente.",
    unexpected: "Ocurrió un error inesperado al añadir la vacuna.",
  },
  ja: {
    new: "新しいワクチン記録",
    select: "ペットを選択",
    name: "ワクチン名 *",
    namePh: "例：混合ワクチン",
    type: "ワクチンの種類",
    typePh: "例：DHPPi",
    given: "接種日 *",
    repeat: "接種間隔（月）",
    next: "次回接種日 *",
    vet: "獣医師",
    vetPh: "獣医師または動物病院名",
    notes: "メモ",
    notesPh: "投与量、ロット番号、特記事項",
    auto: "自動リマインダー",
    autoHelp: "30日前、7日前、1日前、および接種当日の9:00に通知します。",
    add: "ワクチン記録を追加",
    first: "先にペットを追加してください",
    firstHelp: "ワクチン記録を作成するにはペットプロフィールが必要です。",
    success: "ワクチン記録を追加しました。",
    unexpected: "ワクチンの追加中に予期しないエラーが発生しました。",
  },
} as const;

export function VaccineForm({
  pets,
  saving,
  onSave,
}: {
  pets: Pet[];
  saving: boolean;
  onSave: (draft: VaccineDraft) => Promise<SaveVaccineResult>;
}) {
  const { language } = usePreferences();
  const c = copy[language];
  const today = toIsoDate(new Date());
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [vaccineName, setVaccineName] = useState("");
  const [vaccineType, setVaccineType] = useState("");
  const [administeredDate, setAdministeredDate] = useState(today);
  const [repeatInterval, setRepeatInterval] = useState("12");
  const [nextDueDate, setNextDueDate] = useState(addMonthsToIsoDate(today, 12));
  const [veterinarian, setVeterinarian] = useState("");
  const [notes, setNotes] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!pets.some((p) => p.id === petId)) setPetId(pets[0]?.id ?? "");
  }, [petId, pets]);
  const updateAdministeredDate = (v: string) => {
    setAdministeredDate(v);
    const calculated = addMonthsToIsoDate(v, Number(repeatInterval));
    if (calculated) setNextDueDate(calculated);
  };
  const updateRepeatInterval = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 3);
    setRepeatInterval(digits);
    const calculated = addMonthsToIsoDate(administeredDate, Number(digits));
    if (calculated) setNextDueDate(calculated);
  };
  const submit = async () => {
    setError("");
    setMessage("");
    const draft: VaccineDraft = {
      petId,
      vaccineName,
      vaccineType,
      administeredDate,
      nextDueDate,
      repeatIntervalMonths: repeatInterval ? Number(repeatInterval) : undefined,
      veterinarian,
      notes,
      notificationEnabled,
    };
    const validationError = validateVaccineDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const result = await onSave(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? c.success);
      setVaccineName("");
      setVaccineType("");
      setVeterinarian("");
      setNotes("");
    } catch {
      setError(c.unexpected);
    }
  };
  if (pets.length === 0)
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>{c.first}</Text>
        <Text style={styles.help}>{c.firstHelp}</Text>
      </View>
    );
  return (
    <View style={styles.card}>
      <Text style={styles.formTitle}>{c.new}</Text>
      <Text style={styles.label}>{c.select}</Text>
      <View style={styles.petChoices}>
        {pets.map((p) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: p.id === petId }}
            key={p.id}
            onPress={() => setPetId(p.id)}
            style={[styles.petChoice, p.id === petId && styles.petChoiceActive]}
          >
            <Text
              style={[
                styles.petChoiceText,
                p.id === petId && styles.petChoiceTextActive,
              ]}
            >
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <FormField
        label={c.name}
        onChangeText={setVaccineName}
        placeholder={c.namePh}
        value={vaccineName}
      />
      <FormField
        label={c.type}
        onChangeText={setVaccineType}
        placeholder={c.typePh}
        value={vaccineType}
      />
      <FormField
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        label={c.given}
        maxLength={10}
        onChangeText={updateAdministeredDate}
        placeholder="YYYY-MM-DD"
        value={administeredDate}
      />
      <FormField
        keyboardType="number-pad"
        label={c.repeat}
        maxLength={3}
        onChangeText={updateRepeatInterval}
        placeholder="12"
        value={repeatInterval}
      />
      <FormField
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        label={c.next}
        maxLength={10}
        onChangeText={setNextDueDate}
        placeholder="YYYY-MM-DD"
        value={nextDueDate}
      />
      <FormField
        label={c.vet}
        onChangeText={setVeterinarian}
        placeholder={c.vetPh}
        value={veterinarian}
      />
      <FormField
        label={c.notes}
        multiline
        onChangeText={setNotes}
        placeholder={c.notesPh}
        textAlignVertical="top"
        value={notes}
      />
      <View style={styles.notificationRow}>
        <View style={styles.notificationCopy}>
          <Text style={styles.notificationTitle}>{c.auto}</Text>
          <Text style={styles.help}>{c.autoHelp}</Text>
        </View>
        <Switch
          accessibilityLabel={c.auto}
          onValueChange={setNotificationEnabled}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={notificationEnabled ? colors.primary : colors.muted}
          value={notificationEnabled}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityRole="alert" style={styles.success}>
          {message}
        </Text>
      ) : null}
      <PrimaryButton loading={saving} onPress={submit} title={c.add} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 22,
    padding: 18,
  },
  formTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 18,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  petChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  petChoice: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  petChoiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  petChoiceText: { color: colors.text, fontWeight: "700" },
  petChoiceTextActive: { color: colors.white },
  notificationRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    padding: 14,
  },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: colors.text, fontWeight: "800" },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  success: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
});
