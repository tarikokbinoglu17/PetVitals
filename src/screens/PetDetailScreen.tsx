import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getPetAgeLabel,
  getPetRecords,
  getPetRecordSummary,
} from "../lib/petDetails";
import type { HealthRecord, Pet, PetDraft, SavePetResult } from "../types";
import { colors, shadow } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
import { formatWeight } from "../lib/globalization";
import { t } from "../lib/i18n";
import { PetForm } from "../components/PetForm";
import { petSpeciesIcon } from "../lib/petSpecies";
import { localizeRecordText } from "../lib/demoLocalization";

type MutationResult = { error?: string; message?: string };

function formatDate(value: string, locale: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function categoryEmoji(category: HealthRecord["category"]) {
  if (category === "Aşı") return "💉";
  if (category === "İlaç") return "💊";
  if (category === "Alerji") return "⚠️";
  if (category === "Laboratuvar") return "🧪";
  if (category === "Operasyon") return "🏥";
  return "🩺";
}
function DetailLine({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailLine, last && styles.detailLineLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function PetDetailScreen({
  pet,
  records,
  onBack,
  onUpdatePet,
  onDeletePet,
  onDeleteRecord,
  savingPet,
}: {
  pet: Pet;
  records: HealthRecord[];
  onBack: () => void;
  onUpdatePet: (draft: PetDraft) => Promise<SavePetResult>;
  onDeletePet: () => Promise<MutationResult>;
  onDeleteRecord: (recordId: string) => Promise<MutationResult>;
  savingPet: boolean;
}) {
  const { language, unitSystem } = usePreferences();
  const [editing, setEditing] = useState(false);
  const petRecords = getPetRecords(pet.id, records);
  const summary = getPetRecordSummary(pet.id, records);
  const ageLabel = getPetAgeLabel(pet.birthDate, new Date(), language);
  const upcoming = summary.upcomingRecord;

  const deletePet = () =>
    Alert.alert(
      t(language, "Dostu sil"),
      language === "tr"
        ? `${pet.name} ve ona bağlı sağlık kayıtları silinsin mi?`
        : language === "de"
          ? `${pet.name} und alle zugehörigen Gesundheitsdaten löschen?`
          : language === "es"
            ? `¿Eliminar a ${pet.name} y sus registros de salud?`
            : language === "ja"
              ? `${pet.name}と関連するすべての健康記録を削除しますか？`
              : `Delete ${pet.name} and all linked health records?`,
      [
        { text: t(language, "Kapat"), style: "cancel" },
        {
          text: t(language, "Sil"),
          style: "destructive",
          onPress: async () => {
            const result = await onDeletePet();
            if (result.error) Alert.alert("PetSolea", result.error);
            else onBack();
          },
        },
      ],
    );

  const deleteRecord = (record: HealthRecord) =>
    Alert.alert(
      t(language, "Kaydı sil"),
      localizeRecordText(record.title, language),
      [
      { text: t(language, "Kapat"), style: "cancel" },
      {
        text: t(language, "Sil"),
        style: "destructive",
        onPress: async () => {
          const result = await onDeleteRecord(record.id);
          if (result.error) Alert.alert("PetSolea", result.error);
        },
      },
      ],
    );

  return (
    <View style={styles.page}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backText}>‹ {t(language, "Dostlarım")}</Text>
      </Pressable>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          {pet.photoUrl ? (
            <Image
              accessibilityLabel={`${pet.name} profile`}
              source={{ uri: pet.photoUrl }}
              style={styles.photo}
            />
          ) : (
            <Text style={styles.emoji}>{petSpeciesIcon(pet.species)}</Text>
          )}
        </View>
        <Text accessibilityRole="header" style={styles.name}>
          {pet.name}
        </Text>
        <Text style={styles.breed}>
          {pet.breed || t(language, pet.species)}
        </Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>{t(language, pet.species)}</Text>
          <Text style={styles.badge}>{ageLabel}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => setEditing((v) => !v)}
            style={styles.editButton}
          >
            <Text style={styles.editText}>
              {editing ? t(language, "Kapat") : t(language, "Düzenle")}
            </Text>
          </Pressable>
          <Pressable onPress={deletePet} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{t(language, "Sil")}</Text>
          </Pressable>
        </View>
      </View>

      {editing ? (
        <View style={styles.editWrap}>
          <PetForm initialPet={pet} saving={savingPet} onSave={onUpdatePet} />
        </View>
      ) : null}

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {pet.weight > 0
              ? formatWeight(pet.weight, unitSystem, language)
              : "—"}
          </Text>
          <Text style={styles.metricLabel}>{t(language, "Kilo")}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{summary.recordCount}</Text>
          <Text style={styles.metricLabel}>{t(language, "Sağlık kaydı")}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{summary.vaccineCount}</Text>
          <Text style={styles.metricLabel}>{t(language, "Aşı")}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t(language, "Profil bilgileri")}</Text>
      <View style={styles.card}>
        <DetailLine
          label={t(language, "Tür")}
          value={t(language, pet.species)}
        />
        <DetailLine
          label={t(language, "Irk")}
          value={pet.breed || t(language, "Belirtilmedi")}
        />
        <DetailLine
          label={t(language, "Doğum tarihi")}
          value={
            pet.birthDate
              ? formatDate(pet.birthDate, language)
              : t(language, "Belirtilmedi")
          }
        />
        <DetailLine label={t(language, "Yaş")} value={ageLabel} />
        <DetailLine
          label={t(language, "Cinsiyet")}
          value={t(language, "Henüz eklenmedi")}
        />
        <DetailLine
          label={t(language, "Mikroçip")}
          value={t(language, "Henüz eklenmedi")}
          last
        />
      </View>

      <Text style={styles.sectionTitle}>{t(language, "Sağlık özeti")}</Text>
      <View style={styles.healthCard}>
        <View style={styles.healthIcon}>
          <Text style={styles.healthIconText}>♡</Text>
        </View>
        <View style={styles.healthCopy}>
          <Text style={styles.healthTitle}>
            {t(
              language,
              upcoming ? "Yaklaşan bakım kaydı" : "Yaklaşan bakım kaydı yok",
            )}
          </Text>
          <Text style={styles.healthText}>
            {upcoming
              ? `${localizeRecordText(upcoming.title, language)} · ${formatDate(upcoming.date, language)}`
              : t(
                  language,
                  "Yeni bir aşı veya kontrol tarihi ekleyebilirsiniz.",
                )}
          </Text>
          <Text
            style={[
              styles.allergy,
              summary.allergyCount > 0 && styles.allergyWarning,
            ]}
          >
            {summary.allergyCount > 0
              ? `${summary.allergyCount} ${t(language, "kayıt")}`
              : t(language, "Kayıtlı alerji bulunmuyor")}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleInline}>
          {t(language, "Sağlık geçmişi")}
        </Text>
        <Text style={styles.recordCount}>
          {summary.recordCount} {t(language, "kayıt")}
        </Text>
      </View>
      {petRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>
            {t(language, "Henüz sağlık kaydı yok")}
          </Text>
          <Text style={styles.emptyText}>
            {t(
              language,
              "Bu dosta ait aşı ve kontrol kayıtları burada görünecek.",
            )}
          </Text>
        </View>
      ) : (
        petRecords.map((record) => (
          <View key={record.id} style={styles.recordCard}>
            <View
              style={[
                styles.recordIcon,
                record.category === "Alerji" && styles.recordIconDanger,
              ]}
            >
              <Text style={styles.recordEmoji}>
                {categoryEmoji(record.category)}
              </Text>
            </View>
            <View style={styles.recordCopy}>
              <View style={styles.recordTop}>
                <Text style={styles.category}>
                  {localizeRecordText(record.category, language)}
                </Text>
                <Text style={styles.recordDate}>
                  {formatDate(record.date, language)}
                </Text>
              </View>
              <Text style={styles.recordTitle}>
                {localizeRecordText(record.title, language)}
              </Text>
              {record.vaccineType ? (
                <Text style={styles.recordMeta}>{record.vaccineType}</Text>
              ) : null}
              {record.veterinarian ? (
                <Text style={styles.recordMeta}>
                  {language === "de"
                    ? "Tierarzt"
                    : language === "es"
                      ? "Veterinario"
                      : language === "ja"
                        ? "獣医師"
                        : language === "tr"
                          ? "Veteriner"
                          : "Vet"}
                  : {record.veterinarian}
                </Text>
              ) : null}
              {record.notes ? (
                <Text style={styles.notes}>
                  {localizeRecordText(record.notes, language)}
                </Text>
              ) : null}
              <Pressable
                onPress={() => deleteRecord(record)}
                style={styles.recordDelete}
              >
                <Text style={styles.recordDeleteText}>
                  {t(language, "Kaydı sil")}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  backText: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.65 },
  hero: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    padding: 24,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 46,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  photo: { borderRadius: 46, height: 92, width: 92 },
  emoji: { fontSize: 46 },
  name: { color: colors.text, fontSize: 29, fontWeight: "900", marginTop: 14 },
  breed: { color: colors.muted, fontSize: 15, marginTop: 4 },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 14,
  },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actions: { flexDirection: "row", gap: 9, marginTop: 16 },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  editText: { color: colors.white, fontWeight: "800" },
  deleteButton: {
    backgroundColor: "#FBE5E5",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  deleteText: { color: colors.danger, fontWeight: "800" },
  editWrap: { marginTop: 16 },
  metrics: { flexDirection: "row", gap: 10, marginTop: 14 },
  metric: {
    ...shadow,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 17,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 7,
    paddingVertical: 15,
  },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 26,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  detailLine: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingVertical: 10,
  },
  detailLineLast: { borderBottomWidth: 0 },
  detailLabel: { color: colors.muted, flex: 1, fontSize: 13 },
  detailValue: {
    color: colors.text,
    flex: 1.4,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  healthCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    padding: 17,
  },
  healthIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  healthIconText: { color: colors.primary, fontSize: 25, fontWeight: "800" },
  healthCopy: { flex: 1, marginLeft: 13 },
  healthTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  healthText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  allergy: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: 9,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  allergyWarning: { backgroundColor: "#FBE5E5", color: colors.danger },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 26,
  },
  sectionTitleInline: { color: colors.text, fontSize: 20, fontWeight: "900" },
  recordCount: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 26,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 15,
  },
  recordIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  recordIconDanger: { backgroundColor: "#FBE5E5" },
  recordEmoji: { fontSize: 20 },
  recordCopy: { flex: 1, marginLeft: 12 },
  recordTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  category: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  recordDate: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  recordTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },
  recordMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  notes: {
    backgroundColor: colors.background,
    borderRadius: 9,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    padding: 8,
  },
  recordDelete: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 5 },
  recordDeleteText: { color: colors.danger, fontSize: 11, fontWeight: "800" },
});
