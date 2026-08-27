import type { HealthRecord } from "../types";
import type { SupportedLocale } from "./globalization";

export type PetRecordSummary = {
  recordCount: number;
  vaccineCount: number;
  allergyCount: number;
  upcomingRecord?: HealthRecord;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

export function getPetAgeLabel(
  birthDate: string,
  today = new Date(),
  language: SupportedLocale = "tr",
) {
  const copy = {
    tr: {
      missing: "Yaş belirtilmedi",
      infant: "1 aydan küçük",
      months: (n: number) => `${n} aylık`,
      years: (y: number, m: number) => (m ? `${y} yaş ${m} ay` : `${y} yaş`),
    },
    en: {
      missing: "Age not provided",
      infant: "Under 1 month",
      months: (n: number) => `${n} months old`,
      years: (y: number, m: number) =>
        m ? `${y} years ${m} months` : `${y} years old`,
    },
    de: {
      missing: "Alter nicht angegeben",
      infant: "Unter 1 Monat",
      months: (n: number) => `${n} Monate alt`,
      years: (y: number, m: number) =>
        m ? `${y} Jahre ${m} Monate` : `${y} Jahre alt`,
    },
    es: {
      missing: "Edad no indicada",
      infant: "Menos de 1 mes",
      months: (n: number) => `${n} meses`,
      years: (y: number, m: number) =>
        m ? `${y} años ${m} meses` : `${y} años`,
    },
    ja: {
      missing: "年齢未登録",
      infant: "生後1か月未満",
      months: (n: number) => `生後${n}か月`,
      years: (y: number, m: number) => (m ? `${y}歳${m}か月` : `${y}歳`),
    },
  }[language];
  const birth = parseBirthDate(birthDate);
  if (!birth) return copy.missing;

  let months =
    (today.getFullYear() - birth.year) * 12 +
    today.getMonth() -
    (birth.month - 1);
  if (today.getDate() < birth.day) months -= 1;
  if (months < 0) return copy.missing;
  if (months === 0) return copy.infant;
  if (months < 12) return copy.months(months);

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return copy.years(years, remainingMonths);
}

export function getPetRecords(petId: string, records: HealthRecord[]) {
  return records
    .filter((record) => record.petId === petId)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function getPetRecordSummary(
  petId: string,
  records: HealthRecord[],
  today = new Date(),
): PetRecordSummary {
  const petRecords = records.filter((record) => record.petId === petId);
  const todayKey = toDateKey(today);
  const upcomingRecord = petRecords
    .filter((record) => record.date >= todayKey)
    .sort((left, right) => left.date.localeCompare(right.date))[0];

  return {
    recordCount: petRecords.length,
    vaccineCount: petRecords.filter((record) => record.category === "Aşı")
      .length,
    allergyCount: petRecords.filter((record) => record.category === "Alerji")
      .length,
    upcomingRecord,
  };
}
