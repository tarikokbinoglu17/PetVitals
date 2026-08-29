import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";
import type { HealthRecord, Pet } from "../types";
import type { SupportedLocale } from "./globalization";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}

export async function createAndSharePassportPdf(input: {
  pet: Pet;
  records: HealthRecord[];
  publicUrl?: string;
  emergencyNotes?: string;
  language?: SupportedLocale;
}) {
  const language = input.language ?? "en";
  const c = {
    tr: {
      title: "EVRENSEL SAĞLIK PASAPORTU",
      shared: "SAHİBİ TARAFINDAN PAYLAŞILDI",
      birth: "Doğum tarihi",
      weight: "Ağırlık",
      emergency: "Acil not",
      vaccines: "Aşılar",
      critical: "Kritik sağlık kayıtları",
      online: "Güncel çevrimiçi pasaport",
      empty: "Kayıt yok.",
      owner: "Sahip kaydı",
      footer:
        "Bu belge bir sağlık kaydı paylaşımıdır; veteriner tanısı değildir. “Sahip kaydı” bilgileri veteriner doğrulaması içermez.",
      unavailable: "Bu cihazda dosya paylaşımı kullanılamıyor.",
      dialog: "sağlık pasaportu",
    },
    en: {
      title: "UNIVERSAL HEALTH PASSPORT",
      shared: "SHARED BY OWNER",
      birth: "Birth date",
      weight: "Weight",
      emergency: "Emergency note",
      vaccines: "Vaccinations",
      critical: "Critical health records",
      online: "Current online passport",
      empty: "No records.",
      owner: "Owner entry",
      footer:
        "This document shares health records and is not a veterinary diagnosis. “Owner entry” information has not been verified by a veterinarian.",
      unavailable: "File sharing is not available on this device.",
      dialog: "health passport",
    },
    de: {
      title: "UNIVERSELLER GESUNDHEITSPASS",
      shared: "VOM HALTER GETEILT",
      birth: "Geburtsdatum",
      weight: "Gewicht",
      emergency: "Notfallhinweis",
      vaccines: "Impfungen",
      critical: "Kritische Gesundheitsdaten",
      online: "Aktueller Online-Pass",
      empty: "Keine Einträge.",
      owner: "Halter-Eintrag",
      footer:
        "Dieses Dokument dient dem Teilen von Gesundheitsdaten und ist keine tierärztliche Diagnose. „Halter-Einträge“ wurden nicht tierärztlich bestätigt.",
      unavailable: "Dateifreigabe ist auf diesem Gerät nicht verfügbar.",
      dialog: "Gesundheitspass",
    },
    es: {
      title: "PASAPORTE SANITARIO UNIVERSAL",
      shared: "COMPARTIDO POR EL RESPONSABLE",
      birth: "Fecha de nacimiento",
      weight: "Peso",
      emergency: "Nota de emergencia",
      vaccines: "Vacunas",
      critical: "Registros de salud críticos",
      online: "Pasaporte en línea actualizado",
      empty: "No hay registros.",
      owner: "Registro del responsable",
      footer:
        "Este documento comparte registros de salud y no constituye un diagnóstico veterinario. Los datos de “Registro del responsable” no han sido verificados por un veterinario.",
      unavailable: "Este dispositivo no permite compartir archivos.",
      dialog: "pasaporte sanitario",
    },
    ja: {
      title: "ユニバーサル健康パスポート",
      shared: "飼い主が共有",
      birth: "生年月日",
      weight: "体重",
      emergency: "緊急時メモ",
      vaccines: "ワクチン",
      critical: "重要な健康記録",
      online: "最新のオンラインパスポート",
      empty: "記録はありません。",
      owner: "飼い主による記録",
      footer:
        "この文書は健康記録を共有するもので、獣医師による診断ではありません。「飼い主による記録」は獣医師の確認を受けていません。",
      unavailable: "この端末ではファイル共有を利用できません。",
      dialog: "健康パスポート",
    },
  }[language];
  const records = input.records.filter(
    (record) => record.petId === input.pet.id,
  );
  const vaccines = records.filter((record) => record.category === "Aşı");
  const critical = records.filter((record) =>
    ["Alerji", "İlaç", "Tedavi", "Operasyon"].includes(record.category),
  );
  const row = (label: string, value: unknown) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "—")}</td></tr>`;
  const items = (values: HealthRecord[]) =>
    values.length
      ? `<ul>${values.map((value) => `<li><strong>${escapeHtml(value.title)}</strong><br><span>${escapeHtml(value.date)} · ${escapeHtml(value.veterinarian || c.owner)}</span></li>`).join("")}</ul>`
      : `<p class="muted">${escapeHtml(c.empty)}</p>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:34px}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17352d;font-size:12px}
    .brand{color:#1c735b;font-size:11px;font-weight:800;letter-spacing:1.4px}.hero{background:#e8f4ef;border-radius:18px;padding:20px;margin:12px 0 16px}
    h1{font-size:28px;margin:4px 0}h2{font-size:16px;margin:18px 0 8px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #dfe8e3;padding:8px;text-align:left}th{width:34%;color:#5d7169}
    .card{border:1px solid #dfe8e3;border-radius:14px;padding:14px;margin:10px 0}.badge{background:#fff3df;border-radius:12px;color:#8b581d;display:inline-block;padding:5px 8px;font-size:9px;font-weight:800}
    li{margin:0 0 8px}.muted{color:#6e7d78}.footer{color:#6e7d78;font-size:9px;margin-top:22px}
  </style></head><body>
    <div class="brand">PETSOLEA · ${escapeHtml(c.title)}</div>
    <div class="hero"><span class="badge">${escapeHtml(c.shared)}</span><h1>${escapeHtml(input.pet.name)}</h1><p>${escapeHtml(input.pet.species)} · ${escapeHtml(input.pet.breed)}</p></div>
    <table>${row(c.birth, input.pet.birthDate)}${row(c.weight, input.pet.weight ? `${input.pet.weight} kg` : "")}${row(c.emergency, input.emergencyNotes)}</table>
    <div class="card"><h2>${escapeHtml(c.vaccines)}</h2>${items(vaccines)}</div>
    <div class="card"><h2>${escapeHtml(c.critical)}</h2>${items(critical)}</div>
    ${input.publicUrl ? `<div class="card"><h2>${escapeHtml(c.online)}</h2><p>${escapeHtml(input.publicUrl)}</p></div>` : ""}
    <p class="footer">${escapeHtml(c.footer)}</p>
  </body></html>`;

  if (Platform.OS === "web") {
    if (input.publicUrl) await Share.share({ message: input.publicUrl });
    else await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error(c.unavailable);
  await Sharing.shareAsync(uri, {
    UTI: ".pdf",
    mimeType: "application/pdf",
    dialogTitle: `${input.pet.name} ${c.dialog}`,
  });
}
