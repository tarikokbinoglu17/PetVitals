import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePreferences } from "../context/PreferencesContext";
import {
  confirmDocumentExtraction,
  scanPetDocument,
} from "../lib/ai";
import { colors } from "../theme";
import type { Pet } from "../types";

type DocumentKind = "vaccine" | "medication" | "record";
type ReviewData = {
  documentType: string;
  title: string;
  vaccineName: string;
  vaccineType: string;
  administeredDate: string;
  nextDueDate: string;
  medicationName: string;
  dosageText: string;
  veterinarian: string;
  recordDate: string;
  notes: string;
  confidence: string;
};

const copy = {
  tr: {
    title: "Belge Tarama",
    close: "Kapat",
    note: "Aşı karnesi veya veteriner raporunu kamerayla tarayın ya da galeriden seçin. Bilgiler siz kontrol edip onaylamadan sağlık kaydına eklenmez.",
    camera: "Kamerayla tara",
    gallery: "Galeriden seç",
    cameraPermission: "Belge taramak için kamera izni gerekli.",
    photoPermission: "Belge seçmek için fotoğraf erişimi gerekli.",
    read: "Belge okunamadı. Lütfen yeniden deneyin.",
    failed: "Belge analizi başarısız oldu.",
    review: "Kontrol et ve düzelt",
    warning: "AI hata yapabilir. Tarihleri, ilaç dozunu ve veteriner bilgisini belgenin aslıyla karşılaştırın.",
    vaccine: "Aşı",
    medication: "İlaç",
    record: "Diğer sağlık kaydı",
    documentType: "Belge türü",
    recordTitle: "Kayıt başlığı",
    vaccineName: "Aşı adı",
    vaccineType: "Aşı türü",
    administeredDate: "Uygulama tarihi (YYYY-AA-GG)",
    nextDueDate: "Sonraki doz tarihi (YYYY-AA-GG)",
    medicationName: "İlaç adı",
    dosageText: "Doz ve kullanım",
    veterinarian: "Veteriner / klinik",
    recordDate: "Kayıt tarihi (YYYY-AA-GG)",
    notes: "Notlar",
    confirm: "Onayla ve sağlık kaydına ekle",
    confirmed: "Belge doğrulandı ve sağlık kaydına eklendi.",
    required: "Kayıt için ad veya başlık gerekli.",
    scanAnother: "Başka belge tara",
  },
  en: {
    title: "Document Scanner",
    close: "Close",
    note: "Scan a vaccine card or veterinary report with the camera, or choose it from your library. Nothing becomes a health record until you review and approve it.",
    camera: "Scan with camera",
    gallery: "Choose from library",
    cameraPermission: "Camera permission is required to scan a document.",
    photoPermission: "Photo access is required to choose a document.",
    read: "Could not read the document. Please try again.",
    failed: "Document analysis failed.",
    review: "Review and correct",
    warning: "AI can make mistakes. Compare dates, medication dosage and veterinarian details with the original document.",
    vaccine: "Vaccine",
    medication: "Medication",
    record: "Other health record",
    documentType: "Document type",
    recordTitle: "Record title",
    vaccineName: "Vaccine name",
    vaccineType: "Vaccine type",
    administeredDate: "Administered date (YYYY-MM-DD)",
    nextDueDate: "Next due date (YYYY-MM-DD)",
    medicationName: "Medication name",
    dosageText: "Dosage and directions",
    veterinarian: "Veterinarian / clinic",
    recordDate: "Record date (YYYY-MM-DD)",
    notes: "Notes",
    confirm: "Approve and add to health record",
    confirmed: "Document approved and added to the health record.",
    required: "A name or title is required.",
    scanAnother: "Scan another document",
  },
  de: {
    title: "Dokumentenscan",
    close: "Schließen",
    note: "Impfpass oder Tierarztbericht mit der Kamera scannen oder aus der Galerie wählen. Erst Ihre Prüfung und Bestätigung erstellt einen Gesundheitseintrag.",
    camera: "Mit Kamera scannen",
    gallery: "Aus Galerie wählen",
    cameraPermission: "Zum Scannen ist Kamerazugriff erforderlich.",
    photoPermission: "Zum Auswählen ist Fotozugriff erforderlich.",
    read: "Dokument konnte nicht gelesen werden. Bitte erneut versuchen.",
    failed: "Dokumentanalyse fehlgeschlagen.",
    review: "Prüfen und korrigieren",
    warning: "AI kann Fehler machen. Daten, Dosierung und Tierarztangaben mit dem Original vergleichen.",
    vaccine: "Impfung",
    medication: "Medikament",
    record: "Anderer Gesundheitseintrag",
    documentType: "Dokumenttyp",
    recordTitle: "Titel",
    vaccineName: "Impfstoff",
    vaccineType: "Impfart",
    administeredDate: "Verabreicht am (JJJJ-MM-TT)",
    nextDueDate: "Nächster Termin (JJJJ-MM-TT)",
    medicationName: "Medikament",
    dosageText: "Dosierung und Anwendung",
    veterinarian: "Tierarzt / Klinik",
    recordDate: "Datum (JJJJ-MM-TT)",
    notes: "Notizen",
    confirm: "Bestätigen und speichern",
    confirmed: "Dokument bestätigt und gespeichert.",
    required: "Name oder Titel ist erforderlich.",
    scanAnother: "Weiteres Dokument scannen",
  },
  es: {
    title: "Escáner de documentos",
    close: "Cerrar",
    note: "Escanea una cartilla o informe veterinario con la cámara, o elígelo de la galería. No se crea ningún registro hasta que lo revises y apruebes.",
    camera: "Escanear con cámara",
    gallery: "Elegir de la galería",
    cameraPermission: "Se necesita permiso de cámara para escanear.",
    photoPermission: "Se necesita acceso a fotos para elegir un documento.",
    read: "No se pudo leer el documento. Inténtalo de nuevo.",
    failed: "Falló el análisis del documento.",
    review: "Revisar y corregir",
    warning: "La IA puede equivocarse. Compara fechas, dosis y datos del veterinario con el original.",
    vaccine: "Vacuna",
    medication: "Medicamento",
    record: "Otro registro de salud",
    documentType: "Tipo de documento",
    recordTitle: "Título",
    vaccineName: "Nombre de vacuna",
    vaccineType: "Tipo de vacuna",
    administeredDate: "Fecha aplicada (AAAA-MM-DD)",
    nextDueDate: "Próxima fecha (AAAA-MM-DD)",
    medicationName: "Medicamento",
    dosageText: "Dosis e indicaciones",
    veterinarian: "Veterinario / clínica",
    recordDate: "Fecha (AAAA-MM-DD)",
    notes: "Notas",
    confirm: "Aprobar y guardar",
    confirmed: "Documento aprobado y guardado.",
    required: "Se necesita un nombre o título.",
    scanAnother: "Escanear otro documento",
  },
  ja: {
    title: "書類スキャン", close: "閉じる", note: "ワクチン証明書や診療報告書をカメラで撮影するか、ライブラリから選択してください。確認・承認するまで健康記録には追加されません。",
    camera: "カメラでスキャン", gallery: "ライブラリから選択", cameraPermission: "書類のスキャンにはカメラの許可が必要です。", photoPermission: "書類の選択には写真へのアクセス許可が必要です。",
    read: "書類を読み取れませんでした。もう一度お試しください。", failed: "書類の分析に失敗しました。", review: "確認して修正", warning: "AIは誤る場合があります。日付、投薬量、獣医師情報を原本と照合してください。",
    vaccine: "ワクチン", medication: "薬", record: "その他の健康記録", documentType: "書類の種類", recordTitle: "記録タイトル", vaccineName: "ワクチン名", vaccineType: "ワクチンの種類",
    administeredDate: "接種日（YYYY-MM-DD）", nextDueDate: "次回接種日（YYYY-MM-DD）", medicationName: "薬の名前", dosageText: "用量と使用方法", veterinarian: "獣医師 / 動物病院",
    recordDate: "記録日（YYYY-MM-DD）", notes: "メモ", confirm: "承認して健康記録に追加", confirmed: "書類を承認し、健康記録に追加しました。", required: "名前またはタイトルが必要です。", scanAnother: "別の書類をスキャン",
  },
} as const;

const emptyReview: ReviewData = {
  documentType: "",
  title: "",
  vaccineName: "",
  vaccineType: "",
  administeredDate: "",
  nextDueDate: "",
  medicationName: "",
  dosageText: "",
  veterinarian: "",
  recordDate: "",
  notes: "",
  confidence: "",
};

function stringValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value.join(", ");
    }
  }
  return "";
}

function prepareReview(raw: Record<string, unknown>) {
  const vaccine = Array.isArray(raw.vaccines) ? raw.vaccines[0] : undefined;
  const medication = Array.isArray(raw.medications)
    ? raw.medications[0]
    : undefined;
  const source = {
    ...raw,
    ...(vaccine && typeof vaccine === "object" ? vaccine : {}),
    ...(medication && typeof medication === "object" ? medication : {}),
  };
  const review: ReviewData = {
    documentType: stringValue(source, "documentType", "document_type", "type"),
    title: stringValue(source, "title", "recordTitle", "record_title"),
    vaccineName: stringValue(source, "vaccineName", "vaccine_name", "name"),
    vaccineType: stringValue(source, "vaccineType", "vaccine_type"),
    administeredDate: stringValue(
      source,
      "administeredDate",
      "administered_date",
      "vaccinationDate",
    ),
    nextDueDate: stringValue(source, "nextDueDate", "next_due_date"),
    medicationName: stringValue(
      source,
      "medicationName",
      "medication_name",
      "drugName",
    ),
    dosageText: stringValue(source, "dosageText", "dosage_text", "dosage"),
    veterinarian: stringValue(
      source,
      "veterinarian",
      "veterinarianName",
      "clinic",
    ),
    recordDate: stringValue(source, "recordDate", "record_date", "date"),
    notes: stringValue(source, "notes", "description", "warnings"),
    confidence: stringValue(source, "confidence"),
  };
  const kind: DocumentKind = review.vaccineName
    ? "vaccine"
    : review.medicationName
      ? "medication"
      : "record";
  return { kind, review };
}

function ReviewField({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="sentences"
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && styles.multiline]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

export function DocumentScannerPanel({
  pet,
  onClose,
  onConfirmed,
}: {
  pet: Pet;
  onClose: () => void;
  onConfirmed?: () => void | Promise<void>;
}) {
  const { language } = usePreferences();
  const c = copy[language];
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [kind, setKind] = useState<DocumentKind>("record");
  const [review, setReview] = useState<ReviewData>(emptyReview);
  const [confirmed, setConfirmed] = useState(false);

  const setField = (key: keyof ReviewData, value: string) =>
    setReview((current) => ({ ...current, [key]: value }));

  const pickAndScan = async (source: "camera" | "library") => {
    setError(null);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === "camera" ? c.cameraPermission : c.photoPermission,
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: false,
      base64: true,
      quality: 0.8,
    };
    const picked =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.base64) {
      setError(c.read);
      return;
    }
    setLoading(true);
    setConfirmed(false);
    setExtractionId(null);
    try {
      const mime = asset.mimeType || "image/jpeg";
      const response = await scanPetDocument(
        pet.id,
        `data:${mime};base64,${asset.base64}`,
      );
      const prepared = prepareReview(response.extraction.extracted_data ?? {});
      setKind(prepared.kind);
      setReview(prepared.review);
      setExtractionId(response.extraction.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!extractionId) return;
    const required =
      kind === "vaccine"
        ? review.vaccineName
        : kind === "medication"
          ? review.medicationName
          : review.title;
    if (!required.trim()) {
      setError(c.required);
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const common = {
        documentType: review.documentType || kind,
        veterinarian: review.veterinarian,
        notes: review.notes,
        confidence: review.confidence,
      };
      const confirmedData =
        kind === "vaccine"
          ? {
              ...common,
              vaccineName: review.vaccineName,
              vaccineType: review.vaccineType,
              administeredDate: review.administeredDate,
              nextDueDate: review.nextDueDate,
            }
          : kind === "medication"
            ? {
                ...common,
                medicationName: review.medicationName,
                dosageText: review.dosageText,
              }
            : {
                ...common,
                title: review.title,
                recordDate: review.recordDate,
              };
      await confirmDocumentExtraction(extractionId, confirmedData);
      setConfirmed(true);
      await onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setExtractionId(null);
    setReview(emptyReview);
    setConfirmed(false);
    setError(null);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>
          ▣ {pet.name} {c.title}
        </Text>
        <Pressable onPress={onClose}>
          <Text style={styles.close}>{c.close}</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>{c.note}</Text>
      {!extractionId ? (
        <View style={styles.scanActions}>
          <Pressable
            disabled={loading}
            onPress={() => pickAndScan("camera")}
            style={styles.button}
          >
            <Text style={styles.buttonText}>▣ {c.camera}</Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => pickAndScan("library")}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={styles.secondaryButtonText}>▤ {c.gallery}</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {extractionId ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>{c.review}</Text>
          <Text style={styles.warning}>{c.warning}</Text>
          <View style={styles.kindRow}>
            {(["vaccine", "medication", "record"] as DocumentKind[]).map(
              (item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: kind === item }}
                  key={item}
                  onPress={() => setKind(item)}
                  style={[styles.kindChip, kind === item && styles.kindChipActive]}
                >
                  <Text
                    style={[
                      styles.kindText,
                      kind === item && styles.kindTextActive,
                    ]}
                  >
                    {item === "vaccine"
                      ? c.vaccine
                      : item === "medication"
                        ? c.medication
                        : c.record}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <ReviewField
            label={c.documentType}
            onChangeText={(value) => setField("documentType", value)}
            value={review.documentType}
          />
          {kind === "vaccine" ? (
            <>
              <ReviewField label={c.vaccineName} onChangeText={(value) => setField("vaccineName", value)} value={review.vaccineName} />
              <ReviewField label={c.vaccineType} onChangeText={(value) => setField("vaccineType", value)} value={review.vaccineType} />
              <ReviewField label={c.administeredDate} onChangeText={(value) => setField("administeredDate", value)} value={review.administeredDate} />
              <ReviewField label={c.nextDueDate} onChangeText={(value) => setField("nextDueDate", value)} value={review.nextDueDate} />
            </>
          ) : kind === "medication" ? (
            <>
              <ReviewField label={c.medicationName} onChangeText={(value) => setField("medicationName", value)} value={review.medicationName} />
              <ReviewField label={c.dosageText} onChangeText={(value) => setField("dosageText", value)} value={review.dosageText} />
            </>
          ) : (
            <>
              <ReviewField label={c.recordTitle} onChangeText={(value) => setField("title", value)} value={review.title} />
              <ReviewField label={c.recordDate} onChangeText={(value) => setField("recordDate", value)} value={review.recordDate} />
            </>
          )}
          <ReviewField label={c.veterinarian} onChangeText={(value) => setField("veterinarian", value)} value={review.veterinarian} />
          <ReviewField label={c.notes} multiline onChangeText={(value) => setField("notes", value)} value={review.notes} />
          {confirmed ? (
            <View style={styles.successBox}>
              <Text style={styles.success}>✓ {c.confirmed}</Text>
              <Pressable onPress={reset} style={styles.scanAgain}>
                <Text style={styles.scanAgainText}>{c.scanAnother}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable disabled={confirming} onPress={confirm} style={styles.confirmButton}>
              {confirming ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{c.confirm}</Text>}
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 16, padding: 17 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  close: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  note: { color: colors.muted, lineHeight: 19, marginTop: 8 },
  scanActions: { flexDirection: "row", gap: 9, marginTop: 14 },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 10 },
  secondaryButton: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 },
  buttonText: { color: colors.white, fontWeight: "900", textAlign: "center" },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: "900", textAlign: "center" },
  loader: { marginTop: 16 },
  error: { color: colors.danger, fontWeight: "700", marginTop: 10 },
  result: { backgroundColor: colors.background, borderRadius: 14, marginTop: 12, padding: 13 },
  resultTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: "900" },
  warning: { color: colors.accent, fontSize: 11, fontWeight: "800", lineHeight: 16, marginTop: 6 },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  kindChip: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  kindChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  kindTextActive: { color: colors.white },
  field: { marginTop: 11 },
  label: { color: colors.muted, fontSize: 10, fontWeight: "900", marginBottom: 5, textTransform: "uppercase" },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 },
  multiline: { minHeight: 86 },
  confirmButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, justifyContent: "center", marginTop: 14, minHeight: 50, paddingHorizontal: 12 },
  successBox: { backgroundColor: "#EAF8F0", borderRadius: 12, marginTop: 14, padding: 12 },
  success: { color: colors.success, fontWeight: "900", lineHeight: 19 },
  scanAgain: { marginTop: 9 },
  scanAgainText: { color: colors.primaryDark, fontWeight: "900" },
});
