import type { SupportedLocale } from "./globalization";

const recordCopy: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    Aşı: "Aşı",
    Kontrol: "Kontrol",
    İlaç: "İlaç",
    Alerji: "Alerji",
    Laboratuvar: "Laboratuvar",
    Operasyon: "Operasyon",
    "Karma aşı tekrarı": "Karma aşı tekrarı",
    "Rutin veteriner kontrolü": "Rutin veteriner kontrolü",
    "Parazit tablet uygulaması": "Parazit tablet uygulaması",
    "Aylık doz tamamlandı.": "Aylık doz tamamlandı.",
  },
  en: {
    Aşı: "Vaccine",
    Kontrol: "Checkup",
    İlaç: "Medication",
    Alerji: "Allergy",
    Laboratuvar: "Laboratory",
    Operasyon: "Surgery",
    "Karma aşı tekrarı": "Combination vaccine booster",
    "Rutin veteriner kontrolü": "Routine veterinary checkup",
    "Parazit tablet uygulaması": "Parasite tablet treatment",
    "Aylık doz tamamlandı.": "Monthly dose completed.",
  },
  de: {
    Aşı: "Impfung",
    Kontrol: "Kontrolle",
    İlaç: "Medikament",
    Alerji: "Allergie",
    Laboratuvar: "Labor",
    Operasyon: "Operation",
    "Karma aşı tekrarı": "Auffrischung der Kombinationsimpfung",
    "Rutin veteriner kontrolü": "Routineuntersuchung beim Tierarzt",
    "Parazit tablet uygulaması": "Parasiten-Tablettenbehandlung",
    "Aylık doz tamamlandı.": "Monatliche Dosis abgeschlossen.",
  },
  es: {
    Aşı: "Vacuna",
    Kontrol: "Revisión",
    İlaç: "Medicamento",
    Alerji: "Alergia",
    Laboratuvar: "Laboratorio",
    Operasyon: "Cirugía",
    "Karma aşı tekrarı": "Refuerzo de vacuna combinada",
    "Rutin veteriner kontrolü": "Revisión veterinaria rutinaria",
    "Parazit tablet uygulaması": "Tratamiento antiparasitario en tableta",
    "Aylık doz tamamlandı.": "Dosis mensual completada.",
  },
  ja: {
    Aşı: "ワクチン",
    Kontrol: "健診",
    İlaç: "薬",
    Alerji: "アレルギー",
    Laboratuvar: "検査",
    Operasyon: "手術",
    "Karma aşı tekrarı": "混合ワクチン追加接種",
    "Rutin veteriner kontrolü": "定期健診",
    "Parazit tablet uygulaması": "寄生虫予防薬の投与",
    "Aylık doz tamamlandı.": "月次投与完了。",
  },
};

export function localizeRecordText(
  value: string | undefined,
  language: SupportedLocale,
) {
  if (!value) return "";
  return recordCopy[language][value] ?? value;
}
