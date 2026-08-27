import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { validatePetDraft } from "../lib/pets";
import { colors } from "../theme";
import type { Pet, PetDraft, SavePetResult } from "../types";
import { FormField } from "./FormField";
import { PrimaryButton } from "./PrimaryButton";
import { usePreferences } from "../context/PreferencesContext";
import { t } from "../lib/i18n";

const speciesOptions: Pet["species"][] = [
  "Kedi",
  "Köpek",
  "Kuş",
  "Tavşan",
  "Sürüngen",
  "Balık",
  "Diğer",
];

export function PetForm({
  saving,
  onSave,
  initialPet,
}: {
  saving: boolean;
  onSave: (draft: PetDraft) => Promise<SavePetResult>;
  initialPet?: Pet;
}) {
  const { language, unitSystem } = usePreferences();
  const [name, setName] = useState(initialPet?.name ?? "");
  const [species, setSpecies] = useState<Pet["species"]>(
    initialPet?.species ?? "Kedi",
  );
  const [breed, setBreed] = useState(initialPet?.breed ?? "");
  const [birthDate, setBirthDate] = useState(initialPet?.birthDate ?? "");
  const [weight, setWeight] = useState("");
  const [photo, setPhoto] = useState<PetDraft["photo"]>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const weightUnit = unitSystem === "imperial" ? "lb" : "kg";

  useEffect(() => {
    if (!initialPet) return;
    setName(initialPet.name);
    setSpecies(initialPet.species);
    setBreed(initialPet.breed || "");
    setBirthDate(initialPet.birthDate || "");
    const displayWeight =
      unitSystem === "imperial"
        ? initialPet.weight * 2.2046226218
        : initialPet.weight;
    setWeight(initialPet.weight > 0 ? displayWeight.toFixed(1) : "");
  }, [initialPet, unitSystem]);

  const pickPhoto = async () => {
    setError("");
    setMessage("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        language === "tr"
          ? "Fotoğraf seçmek için galeri izni vermelisiniz."
          : language === "de"
            ? "Zum Auswählen eines Fotos ist Galeriezugriff erforderlich."
            : language === "es"
              ? "Se requiere acceso a la galería para elegir una foto."
              : language === "ja"
                ? "写真を選択するには写真ライブラリへのアクセスを許可してください。"
                : "Gallery permission is required to choose a photo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      exif: false,
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      setError(
        language === "tr"
          ? "Fotoğraf 10 MB’den küçük olmalı."
          : language === "de"
            ? "Das Foto muss kleiner als 10 MB sein."
            : language === "es"
              ? "La foto debe ocupar menos de 10 MB."
              : language === "ja"
                ? "写真は10MB未満にしてください。"
                : "Photo must be smaller than 10 MB.",
      );
      return;
    }
    setPhoto({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    });
  };

  const submit = async () => {
    setError("");
    setMessage("");
    const entered = weight.trim()
      ? Number(weight.replace(",", "."))
      : undefined;
    const normalizedWeight =
      entered == null
        ? undefined
        : unitSystem === "imperial"
          ? entered / 2.2046226218
          : entered;
    const draft: PetDraft = {
      name,
      species,
      breed,
      birthDate: birthDate.trim() || undefined,
      weight: normalizedWeight,
      photo,
    };
    const validationError = validatePetDraft(draft, new Date(), language);
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
      setMessage(
        result.message ??
          (initialPet
            ? t(language, "Profil güncellendi")
            : t(language, "Dostunuz başarıyla eklendi.")),
      );
      if (!initialPet) {
        setName("");
        setBreed("");
        setBirthDate("");
        setWeight("");
        setPhoto(undefined);
      }
    } catch {
      setError(
        language === "tr"
          ? "İşlem sırasında beklenmeyen bir hata oluştu."
          : language === "de"
            ? "Bei der Verarbeitung ist ein unerwarteter Fehler aufgetreten."
            : language === "es"
              ? "Se produjo un error inesperado durante la operación."
              : language === "ja"
                ? "処理中に予期しないエラーが発生しました。"
                : "An unexpected error occurred.",
      );
    }
  };

  const previewUri = photo?.uri ?? initialPet?.photoUrl;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {initialPet
          ? t(language, "Dost profilini düzenle")
          : t(language, "Yeni dost profili")}
      </Text>
      <View style={styles.photoRow}>
        <View style={styles.photoPreview}>
          {previewUri ? (
            <Image
              accessibilityLabel="Pet photo"
              source={{ uri: previewUri }}
              style={styles.photo}
            />
          ) : (
            <Text style={styles.photoPlaceholder}>🐾</Text>
          )}
        </View>
        <View style={styles.photoCopy}>
          <Text style={styles.photoTitle}>
            {t(language, "Profil fotoğrafı")}
          </Text>
          <Text style={styles.photoHelp}>
            {t(language, "İsteğe bağlı • en fazla 10 MB")}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={pickPhoto}
            style={styles.photoButton}
          >
            <Text style={styles.photoButtonText}>
              {t(language, previewUri ? "Fotoğrafı değiştir" : "Galeriden seç")}
            </Text>
          </Pressable>
          {photo ? (
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => setPhoto(undefined)}
            >
              <Text style={styles.removePhoto}>
                {t(language, "Fotoğrafı kaldır")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={styles.label}>{t(language, "Tür")} *</Text>
      <View style={styles.choices}>
        {speciesOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: species === option }}
            key={option}
            onPress={() => setSpecies(option)}
            style={[styles.choice, species === option && styles.choiceActive]}
          >
            <Text
              style={[
                styles.choiceText,
                species === option && styles.choiceTextActive,
              ]}
            >
              {t(language, option)}
            </Text>
          </Pressable>
        ))}
      </View>
      <FormField
        label={`${t(language, "Adı")} *`}
        onChangeText={setName}
        placeholder={
          language === "tr"
            ? "Örn. Moka"
            : language === "de"
              ? "z. B. Moka"
              : language === "es"
                ? "p. ej., Moka"
                : language === "ja"
                  ? "例：モカ"
                  : "e.g. Moka"
        }
        value={name}
      />
      <FormField
        label={t(language, "Irkı")}
        onChangeText={setBreed}
        placeholder="Golden Retriever"
        value={breed}
      />
      <FormField
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        label={t(language, "Doğum tarihi")}
        maxLength={10}
        onChangeText={setBirthDate}
        placeholder="YYYY-MM-DD"
        value={birthDate}
      />
      <FormField
        keyboardType="decimal-pad"
        label={`${t(language, "Ağırlık")} (${weightUnit})`}
        maxLength={7}
        onChangeText={(value) => setWeight(value.replace(/[^0-9,.]/g, ""))}
        placeholder={unitSystem === "imperial" ? "10.1" : "4,6"}
        value={weight}
      />
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
      <PrimaryButton
        loading={saving}
        onPress={submit}
        title={
          initialPet
            ? t(language, "Değişiklikleri kaydet")
            : t(language, "Dostumu ekle")
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    padding: 18,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 18,
  },
  photoRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 16,
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
    padding: 14,
  },
  photoPreview: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  photo: { height: "100%", width: "100%" },
  photoPlaceholder: { fontSize: 30 },
  photoCopy: { flex: 1 },
  photoTitle: { color: colors.text, fontWeight: "800" },
  photoHelp: { color: colors.muted, fontSize: 11, marginTop: 3 },
  photoButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 10,
    marginTop: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  photoButtonText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  removePhoto: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  choice: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  choiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: { color: colors.text, fontWeight: "700" },
  choiceTextActive: { color: colors.white },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  success: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
});
