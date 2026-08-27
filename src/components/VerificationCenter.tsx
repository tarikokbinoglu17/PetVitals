import React, { useCallback, useEffect, useState } from "react";
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
  loadVerificationCenter,
  requestRecordVerification,
  reviewRecordVerification,
  submitVeterinarianCredentials,
  type VerificationCandidate,
  type VeterinarianCredentialStatus,
} from "../lib/verifications";
import { colors, shadow } from "../theme";
import type { Pet } from "../types";

const copy = {
  tr: {
    title: "Kayıt Güveni",
    ownerText: "Kayıtları ‘sahip girişi’ olarak paylaşabilir veya davet ettiğiniz, kimliği doğrulanmış bir veterinerden doğrulama isteyebilirsiniz.",
    vetText: "Yalnızca klinik kaydı veya özgün belgeyle bizzat karşılaştırdığınız kayıtları doğrulayın.",
    empty: "Doğrulanabilecek kayıt henüz yok.",
    request: "Veteriner doğrulaması iste",
    owner: "Sahip girişi",
    pending: "Veteriner incelemesinde",
    verified: "Veteriner doğruladı",
    rejected: "Doğrulanmadı",
    credentialTitle: "Veteriner kimlik doğrulaması",
    clinic: "Klinik adı",
    country: "Ruhsat ülkesi",
    license: "Ruhsat / sicil numarası",
    submit: "Doğrulamaya gönder",
    credentialPending: "Kimlik bilgileri yönetici incelemesinde.",
    credentialVerified: "Veteriner kimliği doğrulandı.",
    credentialRejected: "Kimlik başvurusu reddedildi; bilgileri düzeltip yeniden gönderin.",
    attest: "Özgün klinik kaydını veya belgeyi kontrol ettim.",
    verifier: "Doğrulayan kişinin adı (opsiyonel)",
    notes: "İnceleme notu (opsiyonel)",
    approve: "Doğrula",
    reject: "Reddet",
    loadFail: "Doğrulama merkezi yüklenemedi.",
  },
  en: {
    title: "Record Trust",
    ownerText: "Share records as owner-entered, or request verification from an invited veterinarian whose credentials have been approved.",
    vetText: "Verify only records you personally compared with the clinic source or original document.",
    empty: "No records are available for verification yet.",
    request: "Request veterinarian verification",
    owner: "Owner entered",
    pending: "Veterinarian review pending",
    verified: "Veterinarian verified",
    rejected: "Not verified",
    credentialTitle: "Veterinarian credential review",
    clinic: "Clinic name",
    country: "License country",
    license: "License / registration number",
    submit: "Submit for review",
    credentialPending: "Credentials are awaiting administrator review.",
    credentialVerified: "Veterinarian credentials verified.",
    credentialRejected: "Credential review was rejected; correct and resubmit the details.",
    attest: "I checked the original clinic record or document.",
    verifier: "Verifier name (optional)",
    notes: "Review note (optional)",
    approve: "Verify",
    reject: "Reject",
    loadFail: "Verification center could not be loaded.",
  },
  de: {
    title: "Datenvertrauen",
    ownerText: "Einträge als Halterangabe teilen oder eine Prüfung durch einen eingeladenen, verifizierten Tierarzt anfordern.",
    vetText: "Nur Einträge bestätigen, die mit Klinikakte oder Originaldokument verglichen wurden.",
    empty: "Noch keine prüfbaren Einträge.",
    request: "Tierärztliche Prüfung anfordern",
    owner: "Halterangabe",
    pending: "Prüfung ausstehend",
    verified: "Tierärztlich bestätigt",
    rejected: "Nicht bestätigt",
    credentialTitle: "Tierarzt-Nachweis",
    clinic: "Klinik",
    country: "Lizenzland",
    license: "Lizenznummer",
    submit: "Zur Prüfung senden",
    credentialPending: "Nachweise werden administrativ geprüft.",
    credentialVerified: "Tierarzt-Nachweise bestätigt.",
    credentialRejected: "Nachweise abgelehnt; Angaben korrigieren und erneut senden.",
    attest: "Originale Klinikakte oder Dokument geprüft.",
    verifier: "Name (optional)",
    notes: "Prüfnotiz (optional)",
    approve: "Bestätigen",
    reject: "Ablehnen",
    loadFail: "Prüfzentrum konnte nicht geladen werden.",
  },
  es: {
    title: "Confianza del registro",
    ownerText: "Comparte registros como introducidos por el dueño o solicita revisión de un veterinario invitado con credenciales aprobadas.",
    vetText: "Verifica solo registros comparados personalmente con la historia clínica o documento original.",
    empty: "Aún no hay registros para verificar.",
    request: "Solicitar verificación veterinaria",
    owner: "Introducido por el dueño",
    pending: "Revisión pendiente",
    verified: "Verificado por veterinario",
    rejected: "No verificado",
    credentialTitle: "Credenciales veterinarias",
    clinic: "Clínica",
    country: "País de licencia",
    license: "Número de licencia",
    submit: "Enviar a revisión",
    credentialPending: "Las credenciales esperan revisión administrativa.",
    credentialVerified: "Credenciales veterinarias verificadas.",
    credentialRejected: "Credenciales rechazadas; corrige y vuelve a enviar.",
    attest: "Revisé la historia clínica o documento original.",
    verifier: "Nombre del verificador (opcional)",
    notes: "Nota de revisión (opcional)",
    approve: "Verificar",
    reject: "Rechazar",
    loadFail: "No se pudo cargar el centro de verificación.",
  },
  ja: {
    title: "記録の信頼性", ownerText: "飼い主入力として共有するか、認証済みの招待獣医師に確認を依頼できます。", vetText: "診療記録または原本とご自身で照合した記録のみ確認してください。",
    empty: "確認できる記録はまだありません。", request: "獣医師の確認を依頼", owner: "飼い主入力", pending: "獣医師が確認中", verified: "獣医師確認済み", rejected: "未確認",
    credentialTitle: "獣医師資格の確認", clinic: "動物病院名", country: "免許の国", license: "免許 / 登録番号", submit: "審査に提出", credentialPending: "資格情報は管理者による審査中です。",
    credentialVerified: "獣医師資格が確認されました。", credentialRejected: "資格審査で承認されませんでした。内容を修正して再提出してください。", attest: "診療記録または原本を確認しました。",
    verifier: "確認者名（任意）", notes: "確認メモ（任意）", approve: "確認済みにする", reject: "却下", loadFail: "確認センターを読み込めませんでした。",
  },
} as const;

function statusLabel(
  status: VerificationCandidate["status"],
  c: (typeof copy)[keyof typeof copy],
) {
  if (status === "pending") return c.pending;
  if (status === "vet_verified") return c.verified;
  if (status === "rejected") return c.rejected;
  return c.owner;
}

function credentialMessage(
  status: VeterinarianCredentialStatus,
  c: (typeof copy)[keyof typeof copy],
) {
  if (status === "verified") return c.credentialVerified;
  if (status === "pending") return c.credentialPending;
  if (status === "rejected") return c.credentialRejected;
  return "";
}

export function VerificationCenter({
  pet,
  userId,
}: {
  pet: Pet;
  userId: string;
}) {
  const { language } = usePreferences();
  const c = copy[language];
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadVerificationCenter>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [clinicName, setClinicName] = useState("");
  const [licenseCountry, setLicenseCountry] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [verifierName, setVerifierName] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewedSource, setReviewedSource] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const next = await loadVerificationCenter(userId, pet.id);
      setData(next);
      if (next.credentialClinic) setClinicName(next.credentialClinic);
    } catch {
      setError(c.loadFail);
    } finally {
      setLoading(false);
    }
  }, [c.loadFail, pet.id, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = async (candidate: VerificationCandidate) => {
    setBusyId(candidate.entityId);
    setError(undefined);
    try {
      await requestRecordVerification(
        pet.id,
        candidate.entityType,
        candidate.entityId,
      );
      await refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : c.loadFail,
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const submitCredentials = async () => {
    setBusyId("credentials");
    setError(undefined);
    try {
      await submitVeterinarianCredentials({
        clinicName,
        licenseCountry,
        licenseNumber,
      });
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : c.loadFail,
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const review = async (
    candidate: VerificationCandidate,
    status: "vet_verified" | "rejected",
  ) => {
    if (!candidate.verificationId || (status === "vet_verified" && !reviewedSource)) {
      return;
    }
    setBusyId(candidate.entityId);
    setError(undefined);
    try {
      await reviewRecordVerification({
        verificationId: candidate.verificationId,
        status,
        clinicName,
        verifierName,
        notes,
      });
      setReviewedSource(false);
      setNotes("");
      await refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : c.loadFail);
    } finally {
      setBusyId(undefined);
    }
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }
  if (!data?.isOwner && !data?.isVeterinarian) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>✓ {c.title}</Text>
      <Text style={styles.description}>
        {data.isOwner ? c.ownerText : c.vetText}
      </Text>
      {data.isVeterinarian ? (
        <View style={styles.credentialBox}>
          <Text style={styles.subtitle}>{c.credentialTitle}</Text>
          {data.credentialStatus !== "not_submitted" ? (
            <Text
              style={[
                styles.statusText,
                data.credentialStatus === "verified" && styles.verifiedText,
              ]}
            >
              {credentialMessage(data.credentialStatus, c)}
            </Text>
          ) : null}
          {data.credentialStatus === "not_submitted" ||
          data.credentialStatus === "rejected" ? (
            <>
              <TextInput placeholder={c.clinic} placeholderTextColor={colors.muted} style={styles.input} value={clinicName} onChangeText={setClinicName} />
              <TextInput placeholder={c.country} placeholderTextColor={colors.muted} style={styles.input} value={licenseCountry} onChangeText={setLicenseCountry} />
              <TextInput autoCapitalize="characters" placeholder={c.license} placeholderTextColor={colors.muted} style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} />
              <Pressable disabled={busyId === "credentials" || !clinicName.trim() || !licenseCountry.trim() || !licenseNumber.trim()} onPress={submitCredentials} style={styles.primary}>
                <Text style={styles.primaryText}>{c.submit}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
      {data.isVeterinarian && data.credentialStatus === "verified" && data.candidates.length ? (
        <View style={styles.reviewBox}>
          <Pressable onPress={() => setReviewedSource((value) => !value)} style={styles.attestation}>
            <View style={[styles.checkbox, reviewedSource && styles.checkboxActive]}>
              {reviewedSource ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.attestationText}>{c.attest}</Text>
          </Pressable>
          <TextInput placeholder={c.verifier} placeholderTextColor={colors.muted} style={styles.input} value={verifierName} onChangeText={setVerifierName} />
          <TextInput multiline placeholder={c.notes} placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} />
        </View>
      ) : null}
      {data.candidates.length ? (
        data.candidates.slice(0, 20).map((candidate) => (
          <View key={`${candidate.entityType}:${candidate.entityId}`} style={styles.record}>
            <View style={styles.recordCopy}>
              <Text style={styles.recordTitle}>{candidate.label}</Text>
              <Text style={styles.recordMeta}>
                {candidate.date ? `${candidate.date} · ` : ""}
                {statusLabel(candidate.status, c)}
              </Text>
              {candidate.clinicName ? <Text style={styles.recordMeta}>{candidate.clinicName}</Text> : null}
            </View>
            {data.isOwner && candidate.status !== "pending" && candidate.status !== "vet_verified" ? (
              <Pressable disabled={Boolean(busyId)} onPress={() => request(candidate)} style={styles.linkButton}>
                <Text style={styles.linkText}>{c.request}</Text>
              </Pressable>
            ) : null}
            {data.isVeterinarian && candidate.verificationId ? (
              <View style={styles.reviewActions}>
                <Pressable disabled={Boolean(busyId) || !reviewedSource} onPress={() => review(candidate, "vet_verified")} style={[styles.smallButton, !reviewedSource && styles.disabled]}>
                  <Text style={styles.smallButtonText}>{c.approve}</Text>
                </Pressable>
                <Pressable disabled={Boolean(busyId)} onPress={() => review(candidate, "rejected")} style={[styles.smallButton, styles.rejectButton]}>
                  <Text style={styles.smallButtonText}>{c.reject}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>{c.empty}</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 18 },
  wrap: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 18, marginTop: 6, padding: 17 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  credentialBox: { backgroundColor: colors.background, borderRadius: 14, marginTop: 13, padding: 12 },
  reviewBox: { backgroundColor: colors.primarySoft, borderRadius: 14, marginTop: 12, padding: 12 },
  statusText: { color: colors.accent, fontSize: 11, fontWeight: "800", marginTop: 6 },
  verifiedText: { color: colors.success },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, marginTop: 8, minHeight: 43, paddingHorizontal: 11, paddingVertical: 8 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 11, justifyContent: "center", marginTop: 9, minHeight: 44 },
  primaryText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  attestation: { alignItems: "center", flexDirection: "row", gap: 9 },
  checkbox: { alignItems: "center", borderColor: colors.primary, borderRadius: 5, borderWidth: 1, height: 20, justifyContent: "center", width: 20 },
  checkboxActive: { backgroundColor: colors.primary },
  check: { color: colors.white, fontWeight: "900" },
  attestationText: { color: colors.primaryDark, flex: 1, fontSize: 11, fontWeight: "800", lineHeight: 16 },
  record: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: 8, marginTop: 11, paddingTop: 11 },
  recordCopy: { flex: 1 },
  recordTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  recordMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  linkButton: { maxWidth: 120, padding: 5 },
  linkText: { color: colors.primary, fontSize: 10, fontWeight: "900", textAlign: "right" },
  reviewActions: { gap: 5 },
  smallButton: { backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  rejectButton: { backgroundColor: colors.danger },
  smallButtonText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  empty: { color: colors.muted, fontSize: 11, marginTop: 12 },
  error: { color: colors.danger, fontSize: 11, fontWeight: "700", marginTop: 10 },
});
