import type { PetDraft } from "../types";
import type { SupportedLocale } from "./globalization";
import { parseIsoDate } from "./vaccineReminders";

export function validatePetDraft(
  draft: PetDraft,
  today = new Date(),
  language: SupportedLocale = "tr",
) {
  const copy = {
    tr: {
      name: "Dostunuzun adı en az 2 karakter olmalı.",
      species: "Lütfen geçerli bir tür seçin.",
      date: "Doğum tarihini YYYY-AA-GG biçiminde girin.",
      future: "Doğum tarihi gelecekte olamaz.",
      weight: "Ağırlık 0 ile 500 kg arasında olmalı.",
    },
    en: {
      name: "Your pet's name must be at least 2 characters.",
      species: "Please select a valid species.",
      date: "Enter the birth date as YYYY-MM-DD.",
      future: "Birth date cannot be in the future.",
      weight: "Weight must be between 0 and 500 kg.",
    },
    de: {
      name: "Der Name muss mindestens 2 Zeichen lang sein.",
      species: "Bitte wählen Sie eine gültige Tierart.",
      date: "Geben Sie das Geburtsdatum als JJJJ-MM-TT ein.",
      future: "Das Geburtsdatum darf nicht in der Zukunft liegen.",
      weight: "Das Gewicht muss zwischen 0 und 500 kg liegen.",
    },
    es: {
      name: "El nombre debe tener al menos 2 caracteres.",
      species: "Selecciona una especie válida.",
      date: "Introduce la fecha de nacimiento como AAAA-MM-DD.",
      future: "La fecha de nacimiento no puede ser futura.",
      weight: "El peso debe estar entre 0 y 500 kg.",
    },
    ja: {
      name: "ペットの名前は2文字以上で入力してください。",
      species: "有効な動物種を選択してください。",
      date: "生年月日をYYYY-MM-DD形式で入力してください。",
      future: "未来の日付は生年月日に設定できません。",
      weight: "体重は0〜500kgの範囲で入力してください。",
    },
  }[language];
  if (draft.name.trim().length < 2) return copy.name;
  if (
    !["Kedi", "Köpek", "Kuş", "Tavşan", "Sürüngen", "Balık", "Diğer"].includes(
      draft.species,
    )
  )
    return copy.species;

  if (draft.birthDate) {
    const birthDate = parseIsoDate(draft.birthDate);
    if (!birthDate) return copy.date;

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    if (birthDate.getTime() > endOfToday.getTime()) return copy.future;
  }

  if (
    draft.weight !== undefined &&
    (!Number.isFinite(draft.weight) || draft.weight <= 0 || draft.weight > 500)
  ) {
    return copy.weight;
  }

  return null;
}
