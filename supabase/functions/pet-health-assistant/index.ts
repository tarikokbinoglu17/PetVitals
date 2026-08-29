import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function getPublishableKey() {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys);
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy key.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return (payload?.output ?? [])
    .flatMap((item: any) => item?.content ?? [])
    .map((item: any) => item?.text)
    .filter(Boolean)
    .join("\n");
}

const supportedLanguages = ["tr", "en", "de", "es", "ja"] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

const localizedAiCopy: Record<
  SupportedLanguage,
  { moka: string; luna: string; disclaimer: string; languageName: string }
> = {
  tr: {
    moka: "Moka’nın kayıtlı sağlık geçmişinde 12 Ağustos 2026’da parazit tablet uygulaması ve 2 Eylül 2026 için planlanan karma aşı tekrarı görünüyor. Kayıtlarda şu anda acil bir risk işareti yok. Veteriner görüşmesinde yaklaşan karma aşının zamanlamasını, parazit korumasının devam planını ve güncel kilo kontrolünü sorabilirsiniz.",
    luna: "Luna’nın kayıtlı sağlık geçmişinde 18 Eylül 2026 için rutin veteriner kontrolü planlanmış görünüyor. Mevcut demo kayıtlarında acil bir risk işareti yok. Kontrolde genel muayene, kilo takibi, aşı takvimi ve parazit koruma planını gözden geçirmek uygun olur.",
    disclaimer: "PetVitals AI eğitim amaçlı destek sunar; veteriner tanısının yerini tutmaz.",
    languageName: "Turkish",
  },
  en: {
    moka: "Moka’s recorded history shows a parasite treatment on 12 Aug 2026 and a combination-vaccine booster planned for 2 Sep 2026. No urgent risk signal is visible in the demo history. Ask the veterinarian about booster timing, parasite prevention and an updated weight check.",
    luna: "Luna’s recorded history shows a routine veterinary checkup planned for 18 Sep 2026. No urgent risk signal is visible in the demo history. Review general exam findings, weight, vaccination schedule and parasite prevention at the visit.",
    disclaimer: "PetVitals AI provides educational support, not a veterinary diagnosis.",
    languageName: "English",
  },
  de: {
    moka: "Mokas Gesundheitsverlauf enthält eine Parasitenbehandlung am 12. August 2026 und eine Auffrischung der Kombinationsimpfung am 2. September 2026. In den Demo-Daten ist kein akutes Risikosignal erkennbar. Fragen Sie nach Impfzeitpunkt, Parasitenprophylaxe und einer aktuellen Gewichtskontrolle.",
    luna: "Für Luna ist laut Gesundheitsverlauf am 18. September 2026 eine Routineuntersuchung geplant. In den Demo-Daten ist kein akutes Risikosignal erkennbar. Besprechen Sie Allgemeinuntersuchung, Gewicht, Impfplan und Parasitenprophylaxe.",
    disclaimer: "PetVitals AI bietet Informationen und ersetzt keine tierärztliche Diagnose.",
    languageName: "German",
  },
  es: {
    moka: "El historial de Moka registra un tratamiento antiparasitario el 12 de agosto de 2026 y un refuerzo de vacuna combinada previsto para el 2 de septiembre de 2026. No aparece ninguna señal urgente en los datos demo. Consulta el momento del refuerzo, la prevención antiparasitaria y un control actualizado del peso.",
    luna: "El historial de Luna muestra una revisión veterinaria rutinaria prevista para el 18 de septiembre de 2026. No aparece ninguna señal urgente en los datos demo. Revisa la exploración general, el peso, el calendario de vacunas y la prevención antiparasitaria.",
    disclaimer: "PetVitals AI ofrece información educativa y no sustituye un diagnóstico veterinario.",
    languageName: "Spanish",
  },
  ja: {
    moka: "Mokaの記録には、2026年8月12日の寄生虫予防薬投与と、2026年9月2日に予定された混合ワクチン追加接種があります。デモ記録に緊急性の高い兆候はありません。受診時に接種時期、寄生虫予防の継続、最新の体重測定について確認してください。",
    luna: "Lunaの記録では、2026年9月18日に定期健診が予定されています。デモ記録に緊急性の高い兆候はありません。健診時に一般状態、体重、ワクチン予定、寄生虫予防について確認してください。",
    disclaimer: "PetVitals AIは情報提供を目的としており、獣医師の診断に代わるものではありません。",
    languageName: "Japanese",
  },
};

function demoAnswer(petId: string, language: SupportedLanguage) {
  return petId === "1"
    ? localizedAiCopy[language].moka
    : localizedAiCopy[language].luna;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const petId = String(body?.petId ?? "");
    const question = String(body?.question ?? "")
      .trim()
      .slice(0, 2000);
    const requestedLanguage = String(body?.language ?? "en").toLowerCase();
    const language: SupportedLanguage = supportedLanguages.includes(
      requestedLanguage as SupportedLanguage,
    )
      ? (requestedLanguage as SupportedLanguage)
      : "en";
    if (!petId || !question)
      return jsonResponse({ error: "petId and question are required" }, 400);

    // The public preview has two fixed pets and never sends private data to AI.
    if (petId === "1" || petId === "2") {
      return jsonResponse({
        answer: demoAnswer(petId, language),
        disclaimer: localizedAiCopy[language].disclaimer,
      });
    }

    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        401,
      );
    }
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getPublishableKey(),
      {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        401,
      );
    }
    const userId = authData.user.id;

    const [{ data: access }, { data: entitlement }] = await Promise.all([
      db
        .from("subscription_access")
        .select("trial_started_at,subscribed")
        .eq("user_id", userId)
        .maybeSingle(),
      db
        .from("pro_entitlements")
        .select("plan,expires_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const trialActive =
      access?.trial_started_at &&
      Date.now() - new Date(access.trial_started_at).getTime() <
        7 * 86_400_000;
    const proActive =
      entitlement?.plan === "pro" &&
      (!entitlement.expires_at ||
        new Date(entitlement.expires_at).getTime() > Date.now());
    if (!access?.subscribed && !trialActive && !proActive) {
      return jsonResponse(
        { error: "Premium access required", code: "PREMIUM_REQUIRED" },
        402,
      );
    }
    const { data: quotaAllowed } = await db.rpc("consume_ai_quota", {
      p_feature: "health_assistant",
      p_limit: 30,
      p_window_seconds: 3600,
    });
    if (!quotaAllowed) {
      return jsonResponse(
        { error: "Hourly AI limit reached", code: "RATE_LIMITED" },
        429,
      );
    }

    const [
      petResult,
      recordsResult,
      vaccinesResult,
      weightsResult,
      lifeResult,
      alertsResult,
      checkInsResult,
      medicationPlansResult,
      medicationDosesResult,
      programsResult,
      measurementsResult,
      visitsResult,
    ] = await Promise.all([
      db
        .from("pets")
        .select("id,name,species,breed,birth_date,weight")
        .eq("id", petId)
        .eq("owner_id", userId)
        .maybeSingle(),
      db
        .from("health_records")
        .select("record_type,title,description,record_date,veterinarian")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("record_date", { ascending: false })
        .limit(60),
      db
        .from("vaccines")
        .select(
          "vaccine_name,vaccine_type,administered_date,next_due_date,notes,veterinarian",
        )
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
      db
        .from("weight_entries")
        .select("weight,measured_at,notes")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("measured_at", { ascending: false })
        .limit(60),
      db
        .from("pet_life_entries")
        .select("entry_type,value_numeric,value_text,unit,occurred_at,notes")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(90),
      db
        .from("smart_health_alerts")
        .select("alert_type,severity,title,message,status,detected_at")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("detected_at", { ascending: false })
        .limit(30),
      db
        .from("daily_check_ins")
        .select(
          "observed_at,appetite,water_intake,stool_quality,energy,pain,mood,red_flags,species_metrics,notes",
        )
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("observed_at", { ascending: false })
        .limit(90),
      db
        .from("medication_plans")
        .select(
          "id,medication_name,dosage_text,instructions,schedule_times,start_date,end_date,active,verification_status",
        )
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .limit(30),
      db
        .from("medication_doses")
        .select("medication_plan_id,planned_at,actual_at,status")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("planned_at", { ascending: false })
        .limit(120),
      db
        .from("care_programs")
        .select("id,condition_key,label,status,targets,verification_status")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .limit(20),
      db
        .from("care_measurements")
        .select("program_id,metric_type,value_numeric,value_text,unit,occurred_at")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(120),
      db
        .from("vet_visits")
        .select("visit_at,clinic_name,veterinarian,summary,status")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .eq("status", "confirmed")
        .order("visit_at", { ascending: false })
        .limit(30),
    ]);
    if (petResult.error || !petResult.data) {
      return jsonResponse({ error: "Pet not found" }, 404);
    }
    const queryError = [
      recordsResult,
      vaccinesResult,
      weightsResult,
      lifeResult,
      alertsResult,
      checkInsResult,
      medicationPlansResult,
      medicationDosesResult,
      programsResult,
      measurementsResult,
      visitsResult,
    ].find((result) => result.error)?.error;
    if (queryError) throw queryError;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        { error: "AI provider is not configured", code: "AI_NOT_CONFIGURED" },
        503,
      );
    }
    const context = {
      pet: petResult.data,
      healthRecords: recordsResult.data ?? [],
      vaccines: vaccinesResult.data ?? [],
      weights: weightsResult.data ?? [],
      lifeEntries: lifeResult.data ?? [],
      smartAlerts: alertsResult.data ?? [],
      dailyCheckIns: checkInsResult.data ?? [],
      medicationPlans: medicationPlansResult.data ?? [],
      medicationDoses: medicationDosesResult.data ?? [],
      carePrograms: programsResult.data ?? [],
      careMeasurements: measurementsResult.data ?? [],
      confirmedVetVisits: visitsResult.data ?? [],
    };
    const instructions = `You are PetVitals Health Brain, a longitudinal memory and visit-preparation assistant for a pet owner. Use only the supplied context for claims about this pet. Separate recorded facts from general educational guidance. You may summarize timelines, adherence and trends, but never diagnose, prescribe, recommend changing a medication dose, or invent missing facts. Treat owner-entered and unverified records as unverified. If breathing difficulty, collapse, seizure, uncontrolled bleeding, repeated vomiting or suspected poisoning is mentioned, say to contact an emergency veterinarian immediately. Respond in ${localizedAiCopy[language].languageName}. Keep the answer concise and actionable. Context: ${JSON.stringify(context)}`;
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini",
        instructions,
        input: question,
        max_output_tokens: 900,
      }),
    });
    if (!aiResponse.ok) {
      console.error(
        "AI request failed",
        aiResponse.status,
        (await aiResponse.text()).slice(0, 1000),
      );
      return jsonResponse({ error: "AI response unavailable" }, 502);
    }
    const answer = extractOutputText(await aiResponse.json()).trim();
    if (!answer) return jsonResponse({ error: "AI response unavailable" }, 502);
    return jsonResponse({
      answer,
      disclaimer: localizedAiCopy[language].disclaimer,
    });
  } catch (error) {
    console.error(
      "pet-health-assistant",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
