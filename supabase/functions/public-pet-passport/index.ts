import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const headers = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex,nofollow,noarchive",
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers });
    }
    const url = new URL(req.url);
    const requestedLanguage = url.searchParams.get("lang") ?? "en";
    const language = (
      ["tr", "en", "de", "es", "ja"].includes(requestedLanguage)
        ? requestedLanguage
        : "en"
    ) as "tr" | "en" | "de" | "es" | "ja";
    const c = {
      tr: {
        missing: "Pasaport bağlantısı eksik",
        expired:
          "Pasaport bağlantısının süresi doldu veya bağlantı iptal edildi",
        notFound: "Evcil hayvan bulunamadı",
        verified: "VETERİNER ONAYLI",
        ownerEntry: "SAHİP KAYDI",
        dateMissing: "Tarih kaydedilmedi",
        next: "Sonraki",
        contact: "Acil durum iletişimi",
        owner: "Sahibi",
        emergency: "Acil durum profili",
        blood: "Kan grubu",
        emergencyVet: "Acil veteriner",
        safety: "Taşıma / güvenlik notları",
        lost: "KAYIP MODU — Bu hayvanı bulduysanız lütfen sahibiyle veya acil veterineriyle iletişime geçin.",
        expires: "Erişim bitişi",
        passport: "PetVitals Sağlık Pasaportu",
        shared: "Sahibi tarafından iptal edilebilir erişimle paylaşıldı.",
        vaccines: "Aşılar",
        medications: "Aktif ilaçlar",
        critical: "Kritik sağlık notları",
        footer:
          "Bu sayfa sağlık kayıtlarını paylaşır; veteriner tanısı değildir. Sahip tarafından girilen kayıtlar, veteriner tarafından doğrulanana kadar açıkça etiketlenir.",
        unexpected: "Beklenmeyen hata",
      },
      en: {
        missing: "Missing passport token",
        expired: "Passport link expired or revoked",
        notFound: "Pet not found",
        verified: "VET VERIFIED",
        ownerEntry: "OWNER ENTERED",
        dateMissing: "Date not recorded",
        next: "Next",
        contact: "Emergency contact",
        owner: "Owner",
        emergency: "Emergency profile",
        blood: "Blood type",
        emergencyVet: "Emergency vet",
        safety: "Transport / safety notes",
        lost: "LOST MODE — Please contact the owner or emergency veterinarian if you found this pet.",
        expires: "Access expires",
        passport: "PetVitals Health Passport",
        shared: "Shared by the owner with revocable access.",
        vaccines: "Vaccines",
        medications: "Active medications",
        critical: "Critical health notes",
        footer:
          "This page shares health records; it is not a veterinary diagnosis. Owner-entered records are explicitly labeled until verified by a veterinarian.",
        unexpected: "Unexpected error",
      },
      de: {
        missing: "Pass-Token fehlt",
        expired: "Pass-Link ist abgelaufen oder wurde widerrufen",
        notFound: "Tier nicht gefunden",
        verified: "TIERÄRZTLICH BESTÄTIGT",
        ownerEntry: "HALTER-EINTRAG",
        dateMissing: "Datum nicht erfasst",
        next: "Nächster Termin",
        contact: "Notfallkontakt",
        owner: "Halter",
        emergency: "Notfallprofil",
        blood: "Blutgruppe",
        emergencyVet: "Notfalltierarzt",
        safety: "Transport- / Sicherheitshinweise",
        lost: "VERMISST — Bitte kontaktieren Sie den Halter oder den Notfalltierarzt, wenn Sie dieses Tier gefunden haben.",
        expires: "Zugriff endet",
        passport: "PetVitals Gesundheitspass",
        shared: "Vom Halter mit widerrufbarem Zugriff geteilt.",
        vaccines: "Impfungen",
        medications: "Aktive Medikamente",
        critical: "Kritische Gesundheitshinweise",
        footer:
          "Diese Seite teilt Gesundheitsdaten und ist keine tierärztliche Diagnose. Halter-Einträge sind bis zur tierärztlichen Bestätigung entsprechend gekennzeichnet.",
        unexpected: "Unerwarteter Fehler",
      },
      es: {
        missing: "Falta el token del pasaporte",
        expired: "El enlace ha caducado o se ha revocado",
        notFound: "No se encontró la mascota",
        verified: "VERIFICADO POR VETERINARIO",
        ownerEntry: "REGISTRO DEL RESPONSABLE",
        dateMissing: "Fecha no registrada",
        next: "Próxima",
        contact: "Contacto de emergencia",
        owner: "Responsable",
        emergency: "Perfil de emergencia",
        blood: "Grupo sanguíneo",
        emergencyVet: "Veterinario de urgencias",
        safety: "Notas de transporte / seguridad",
        lost: "MODO PERDIDO — Si has encontrado esta mascota, contacta con su responsable o con el veterinario de urgencias.",
        expires: "El acceso caduca",
        passport: "Pasaporte sanitario PetVitals",
        shared: "Compartido por el responsable con acceso revocable.",
        vaccines: "Vacunas",
        medications: "Medicamentos activos",
        critical: "Notas de salud críticas",
        footer:
          "Esta página comparte registros de salud y no constituye un diagnóstico veterinario. Los registros del responsable se identifican hasta que un veterinario los verifique.",
        unexpected: "Error inesperado",
      },
      ja: {
        missing: "パスポートトークンがありません",
        expired: "パスポートリンクは期限切れまたは無効です",
        notFound: "ペットが見つかりません",
        verified: "獣医師確認済み",
        ownerEntry: "飼い主による記録",
        dateMissing: "日付未登録",
        next: "次回",
        contact: "緊急連絡先",
        owner: "飼い主",
        emergency: "緊急時プロフィール",
        blood: "血液型",
        emergencyVet: "救急動物病院",
        safety: "搬送 / 安全上の注意",
        lost: "迷子モード — このペットを見つけた方は、飼い主または救急動物病院へご連絡ください。",
        expires: "アクセス期限",
        passport: "PetVitals 健康パスポート",
        shared: "飼い主が取り消し可能なアクセスとして共有しています。",
        vaccines: "ワクチン",
        medications: "服用中の薬",
        critical: "重要な健康メモ",
        footer:
          "このページは健康記録を共有するもので、獣医師による診断ではありません。飼い主による記録は、獣医師の確認を受けるまで明示されます。",
        unexpected: "予期しないエラー",
      },
    }[language];
    const token = (url.searchParams.get("token") ?? "").trim();
    if (!token || token.length > 256) {
      return new Response(c.missing, { status: 400, headers });
    }
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const tokenHash = await sha256Hex(token);
    const { data: share } = await db
      .from("passport_shares")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();
    if (
      !share ||
      (share.expires_at && new Date(share.expires_at).getTime() < Date.now())
    ) {
      return new Response(c.expired, {
        status: 410,
        headers,
      });
    }

    const [
      petResult,
      vaccinesResult,
      recordsResult,
      medicationsResult,
      emergencyResult,
      profileResult,
      verificationsResult,
    ] = await Promise.all([
      db
        .from("pets")
        .select("id,name,species,breed,birth_date,weight")
        .eq("id", share.pet_id)
        .eq("owner_id", share.owner_id)
        .maybeSingle(),
      share.include_vaccines
        ? db
            .from("vaccines")
            .select(
              "id,vaccine_name,vaccine_type,administered_date,next_due_date,veterinarian",
            )
            .eq("pet_id", share.pet_id)
            .eq("owner_id", share.owner_id)
            .order("administered_date", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] }),
      share.include_allergies || share.include_medications
        ? db
            .from("health_records")
            .select("id,record_type,title,description,record_date,veterinarian")
            .eq("pet_id", share.pet_id)
            .eq("owner_id", share.owner_id)
            .order("record_date", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
      share.include_medications
        ? db
            .from("medication_plans")
            .select(
              "id,medication_name,dosage_text,instructions,start_date,end_date,active,prescribing_veterinarian,verification_status",
            )
            .eq("pet_id", share.pet_id)
            .eq("owner_id", share.owner_id)
            .eq("active", true)
            .limit(30)
        : Promise.resolve({ data: [] }),
      db
        .from("pet_emergency_profiles")
        .select(
          "blood_type,emergency_vet_name,emergency_vet_phone,safety_notes",
        )
        .eq("pet_id", share.pet_id)
        .eq("owner_id", share.owner_id)
        .maybeSingle(),
      share.include_owner_contact
        ? db
            .from("profiles")
            .select(
              "full_name,contact_phone,contact_email,emergency_contact_name,emergency_contact_phone",
            )
            .eq("id", share.owner_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      db
        .from("record_verifications")
        .select(
          "entity_type,entity_id,status,clinic_name,verifier_name,verified_at",
        )
        .eq("pet_id", share.pet_id)
        .eq("owner_id", share.owner_id),
    ]);
    const pet = petResult.data;
    if (!pet) return new Response(c.notFound, { status: 404, headers });

    const verificationByEntity = new Map(
      (verificationsResult.data ?? []).map((item: any) => [
        `${item.entity_type}:${item.entity_id}`,
        item,
      ]),
    );
    const verificationBadge = (entityType: string, entityId: string) => {
      const verification: any = verificationByEntity.get(
        `${entityType}:${entityId}`,
      );
      if (verification?.status === "vet_verified") {
        return `<span class="verified">${c.verified}${verification.clinic_name ? ` · ${escapeHtml(verification.clinic_name)}` : ""}</span>`;
      }
      return `<span class="owner">${c.ownerEntry}</span>`;
    };
    const records = (recordsResult.data ?? []).filter((record: any) => {
      const type = String(record.record_type ?? "").toLowerCase();
      return (
        (share.include_allergies &&
          (type.includes("allerg") || type.includes("alerj"))) ||
        (share.include_medications &&
          (type.includes("med") || type.includes("ilaç")))
      );
    });
    const vaccines = (vaccinesResult.data ?? [])
      .map(
        (vaccine: any) =>
          `<li><div><strong>${escapeHtml(vaccine.vaccine_name)}</strong>${verificationBadge("vaccine", vaccine.id)}</div><p>${escapeHtml(vaccine.administered_date || c.dateMissing)}${vaccine.next_due_date ? ` · ${c.next}: ${escapeHtml(vaccine.next_due_date)}` : ""}${vaccine.veterinarian ? ` · ${escapeHtml(vaccine.veterinarian)}` : ""}</p></li>`,
      )
      .join("");
    const criticalRecords = records
      .map(
        (record: any) =>
          `<li><div><strong>${escapeHtml(record.title || record.record_type)}</strong>${verificationBadge("health_record", record.id)}</div><p>${escapeHtml(record.record_date || "")}${record.description ? ` · ${escapeHtml(record.description)}` : ""}</p></li>`,
      )
      .join("");
    const medications = (medicationsResult.data ?? [])
      .map(
        (medication: any) =>
          `<li><div><strong>${escapeHtml(medication.medication_name)}</strong>${verificationBadge("medication_plan", medication.id)}</div><p>${escapeHtml(medication.dosage_text)}${medication.instructions ? ` · ${escapeHtml(medication.instructions)}` : ""}</p></li>`,
      )
      .join("");
    const profile: any = profileResult.data;
    const emergency: any = emergencyResult.data;
    const contact = profile
      ? `<section class="card"><h2>${c.contact}</h2><p>${escapeHtml(profile.full_name || profile.emergency_contact_name || c.owner)}</p><p>${escapeHtml(profile.contact_phone || profile.emergency_contact_phone || "")} ${escapeHtml(profile.contact_email || "")}</p></section>`
      : "";
    const emergencyCard = emergency
      ? `<section class="card emergency"><h2>${c.emergency}</h2>${emergency.blood_type ? `<p><strong>${c.blood}:</strong> ${escapeHtml(emergency.blood_type)}</p>` : ""}${emergency.emergency_vet_name || emergency.emergency_vet_phone ? `<p><strong>${c.emergencyVet}:</strong> ${escapeHtml(emergency.emergency_vet_name || "")} ${escapeHtml(emergency.emergency_vet_phone || "")}</p>` : ""}${emergency.safety_notes ? `<p><strong>${c.safety}:</strong> ${escapeHtml(emergency.safety_notes)}</p>` : ""}</section>`
      : "";
    const lostBanner = share.lost_mode
      ? `<div class="lost">${c.lost}</div>`
      : "";
    const expires = share.expires_at
      ? `<p class="expires">${c.expires} ${escapeHtml(new Date(share.expires_at).toLocaleString(language))}</p>`
      : "";
    const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pet.name)} · ${escapeHtml(c.passport)}</title><style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f5f7f6;color:#17352d}.wrap{max-width:720px;margin:auto;padding:24px}.card{background:#fff;border:1px solid #e0e9e5;border-radius:22px;padding:22px;margin:14px 0;box-shadow:0 8px 28px #0000000b}.lost{background:#b42318;color:#fff;padding:14px;border-radius:14px;font-weight:800}.pill,.verified,.owner{display:inline-block;border-radius:999px;font-size:10px;font-weight:800;padding:5px 8px}.pill{background:#e8f4ef}.verified{background:#ddf7e9;color:#17603f;margin-left:8px}.owner{background:#fff3df;color:#8b581d;margin-left:8px}h1{margin-bottom:6px}h2{font-size:18px}ul{padding-left:20px}li{margin-bottom:14px}li p{color:#667b74;margin:5px 0}.emergency{border-color:#e6a3a0}.expires,small{color:#667b74;font-size:11px}
    </style></head><body><main class="wrap">${lostBanner}<section class="card"><span class="pill">${c.passport}</span><h1>${escapeHtml(pet.name)}</h1><p>${escapeHtml(pet.species)} · ${escapeHtml(pet.breed || "")}</p><small>${c.shared}</small>${expires}</section>${emergencyCard}${vaccines ? `<section class="card"><h2>${c.vaccines}</h2><ul>${vaccines}</ul></section>` : ""}${medications ? `<section class="card"><h2>${c.medications}</h2><ul>${medications}</ul></section>` : ""}${criticalRecords ? `<section class="card"><h2>${c.critical}</h2><ul>${criticalRecords}</ul></section>` : ""}${contact}<section class="card"><small>${c.footer}</small></section></main></body></html>`;
    return new Response(html, { headers });
  } catch (error) {
    console.error(
      "public-pet-passport",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Unexpected error", { status: 500, headers });
  }
});
