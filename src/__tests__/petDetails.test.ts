import {
  getPetAgeLabel,
  getPetRecords,
  getPetRecordSummary,
} from "../lib/petDetails";
import type { HealthRecord } from "../types";

const records: HealthRecord[] = [
  {
    id: "1",
    petId: "moka",
    title: "Parazit uygulaması",
    category: "İlaç",
    date: "2026-08-12",
  },
  {
    id: "2",
    petId: "luna",
    title: "Rutin kontrol",
    category: "Kontrol",
    date: "2026-09-18",
  },
  {
    id: "3",
    petId: "moka",
    title: "Karma aşı",
    category: "Aşı",
    date: "2026-09-02",
  },
  {
    id: "4",
    petId: "moka",
    title: "Tavuk alerjisi",
    category: "Alerji",
    date: "2026-07-01",
  },
];

describe("pet details", () => {
  it("calculates a readable age from the birth date", () => {
    expect(getPetAgeLabel("2021-04-12", new Date(2026, 7, 25))).toBe(
      "5 yaş 4 ay",
    );
    expect(getPetAgeLabel("2026-08-10", new Date(2026, 7, 25))).toBe(
      "1 aydan küçük",
    );
  });

  it("handles missing or invalid birth dates", () => {
    expect(getPetAgeLabel("")).toBe("Yaş belirtilmedi");
    expect(getPetAgeLabel("2026-02-30")).toBe("Yaş belirtilmedi");
  });

  it("formats age in Japanese", () => {
    expect(getPetAgeLabel("2021-04-12", new Date(2026, 7, 25), "ja")).toBe(
      "5歳4か月",
    );
    expect(getPetAgeLabel("", new Date(2026, 7, 25), "ja")).toBe("年齢未登録");
  });

  it("filters and sorts records for the selected pet", () => {
    expect(getPetRecords("moka", records).map((record) => record.id)).toEqual([
      "3",
      "1",
      "4",
    ]);
  });

  it("builds the selected pet health summary", () => {
    expect(getPetRecordSummary("moka", records, new Date(2026, 7, 25))).toEqual(
      {
        recordCount: 3,
        vaccineCount: 1,
        allergyCount: 1,
        upcomingRecord: records[2],
      },
    );
  });
});
