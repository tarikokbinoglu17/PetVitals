import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function getPublishableKey() {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try { const parsed = JSON.parse(keys); if (parsed.default) return parsed.default; } catch {}
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return (payload?.output ?? []).flatMap((item: any) => item?.content ?? []).map((item: any) => item?.text).filter(Boolean).join("\n");
}

function audioFileName(path: string) {
  const name = path.split("/").pop() ?? "vet-visit.m4a";
  return /\.(m4a|mp3|mp4|mpeg|mpga|wav|webm)$/i.test(name) ? name : `${name}.m4a`;
}

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reason: { type: "string" },
    observations: { type: "array", items: { type: "string" } },
    diagnoses: { type: "array", items: { type: "string" } },
    medications: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { name: { type: "string" }, dosage: { type: "string" }, instructions: { type: "string" } },
        required: ["name", "dosage", "instructions"],
      },
    },
    tests: { type: "array", items: { type: "string" } },
    followUps: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { action: { type: "string" }, dueDate: { type: ["string", "null"] } },
        required: ["action", "dueDate"],
      },
    },
    ownerQuestions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["reason", "observations", "diagnoses", "medications", "tests", "followUps", "ownerQuestions", "warnings"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  let visitId = "";
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const db = createClient(Deno.env.get("SUPABASE_URL")!, getPublishableKey(), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = authData.user.id;
    const body = await req.json();
    visitId = String(body?.visitId ?? "");
    if (!visitId) return jsonResponse({ error: "visitId is required" }, 400);

    const [{ data: access }, { data: entitlement }, { data: visit, error: visitError }] = await Promise.all([
      db.from("subscription_access").select("trial_started_at,subscribed").eq("user_id", userId).maybeSingle(),
      db.from("pro_entitlements").select("plan,expires_at").eq("user_id", userId).maybeSingle(),
      db.from("vet_visits").select("*").eq("id", visitId).eq("owner_id", userId).maybeSingle(),
    ]);
    if (visitError || !visit) return jsonResponse({ error: "Visit not found" }, 404);
    const trialActive = access?.trial_started_at && Date.now() - new Date(access.trial_started_at).getTime() < 7 * 86_400_000;
    const proActive = entitlement?.plan === "pro" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now());
    if (!access?.subscribed && !trialActive && !proActive) return jsonResponse({ error: "Premium access required", code: "PREMIUM_REQUIRED" }, 402);
    if (visit.status === "confirmed" && visit.summary) return jsonResponse({ transcript: visit.transcript ?? "", summary: visit.summary, requiresConfirmation: false });
    const { data: quotaAllowed } = await db.rpc("consume_ai_quota", {
      p_feature: "vet_visit_copilot", p_limit: 10, p_window_seconds: 3600,
    });
    if (!quotaAllowed) return jsonResponse({ error: "Hourly visit limit reached", code: "RATE_LIMITED" }, 429);

    await db.from("vet_visits").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", visitId);
    let transcript = String(visit.transcript ?? "").trim();
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

    if (visit.audio_storage_path) {
      if (!visit.recording_consent || !visit.consent_given_at) return jsonResponse({ error: "Recording consent is required" }, 409);
      const { data: audio, error: downloadError } = await db.storage.from("health-documents").download(visit.audio_storage_path);
      if (downloadError || !audio) throw new Error("AUDIO_DOWNLOAD_FAILED");
      if (audio.size > 25 * 1024 * 1024) return jsonResponse({ error: "Audio exceeds 25 MB" }, 413);
      const form = new FormData();
      form.append("file", audio, audioFileName(visit.audio_storage_path));
      form.append("model", Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") ?? "gpt-transcribe");
      form.append("prompt", "Veterinary consultation about a pet. Preserve medication names, dosages, dates, laboratory terms and follow-up instructions. Transcribe in the spoken language.");
      const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
      });
      if (!transcriptionResponse.ok) {
        console.error("Transcription failed", transcriptionResponse.status, (await transcriptionResponse.text()).slice(0, 800));
        throw new Error("TRANSCRIPTION_FAILED");
      }
      const transcriptionPayload = await transcriptionResponse.json();
      transcript = String(transcriptionPayload?.text ?? "").trim();
      if (!transcript) throw new Error("EMPTY_TRANSCRIPT");
    }
    if (!transcript) return jsonResponse({ error: "A recording or transcript is required" }, 400);

    const { data: pet } = await db.from("pets").select("id,name,species,breed").eq("id", visit.pet_id).eq("owner_id", userId).maybeSingle();
    if (!pet) return jsonResponse({ error: "Pet not found" }, 404);
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini",
        instructions: `Extract a veterinary visit summary for ${pet.name}, a ${pet.species}${pet.breed ? ` (${pet.breed})` : ""}. Use only explicitly stated information. Keep uncertainty. Never invent a diagnosis, dose, test result or date. Empty arrays are required when information is absent. Include potentially urgent statements in warnings and make clear that the owner must review the result before it becomes a record.`,
        input: transcript.slice(0, 80_000),
        text: { format: { type: "json_schema", name: "vet_visit_summary", strict: true, schema: summarySchema } },
        max_output_tokens: 1600,
      }),
    });
    if (!aiResponse.ok) {
      console.error("Visit extraction failed", aiResponse.status, (await aiResponse.text()).slice(0, 800));
      throw new Error("SUMMARY_FAILED");
    }
    const summaryText = extractOutputText(await aiResponse.json()).trim();
    const summary = JSON.parse(summaryText);
    const { error: updateError } = await db.from("vet_visits").update({ transcript, summary, status: "needs_review", updated_at: new Date().toISOString() }).eq("id", visitId).eq("owner_id", userId);
    if (updateError) throw updateError;
    if (visit.audio_storage_path) {
      const { error: deleteError } = await db.storage.from("health-documents").remove([visit.audio_storage_path]);
      if (!deleteError) await db.from("vet_visits").update({ audio_storage_path: null }).eq("id", visitId).eq("owner_id", userId);
    }
    return jsonResponse({ transcript, summary, requiresConfirmation: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("vet-visit-copilot", message);
    if (visitId) {
      try {
        const authorization = req.headers.get("Authorization") ?? "";
        const db = createClient(Deno.env.get("SUPABASE_URL")!, getPublishableKey(), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
        await db.from("vet_visits").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", visitId);
      } catch {}
    }
    return jsonResponse({ error: message === "AI_NOT_CONFIGURED" ? "AI provider is not configured" : "Visit processing failed", code: message }, message === "AI_NOT_CONFIGURED" ? 503 : 500);
  }
});
