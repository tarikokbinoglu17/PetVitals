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

const nullableString = { type: ["string", "null"] };
const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: nullableString,
    title: nullableString,
    recordDate: nullableString,
    veterinarian: nullableString,
    vaccineName: nullableString,
    vaccineType: nullableString,
    administeredDate: nullableString,
    nextDueDate: nullableString,
    medicationName: nullableString,
    dosageText: nullableString,
    allergy: nullableString,
    notes: nullableString,
    confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "documentType",
    "title",
    "recordDate",
    "veterinarian",
    "vaccineName",
    "vaccineType",
    "administeredDate",
    "nextDueDate",
    "medicationName",
    "dosageText",
    "allergy",
    "notes",
    "confidence",
    "warnings",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization") ?? "";
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
      return jsonResponse({ error: "Unauthorized" }, 401);
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

    const body = await req.json();
    const petId = String(body?.petId ?? "");
    const imageDataUrl = String(body?.imageDataUrl ?? "");
    if (!petId || !imageDataUrl.startsWith("data:image/")) {
      return jsonResponse(
        { error: "petId and imageDataUrl are required" },
        400,
      );
    }
    if (imageDataUrl.length > 10_000_000) {
      return jsonResponse({ error: "Image is too large" }, 413);
    }
    const { data: quotaAllowed } = await db.rpc("consume_ai_quota", {
      p_feature: "document_scan",
      p_limit: 10,
      p_window_seconds: 3600,
    });
    if (!quotaAllowed) {
      return jsonResponse(
        { error: "Hourly document limit reached", code: "RATE_LIMITED" },
        429,
      );
    }

    const { data: pet } = await db
      .from("pets")
      .select("id,name")
      .eq("id", petId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!pet) return jsonResponse({ error: "Pet not found" }, 404);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        { error: "AI provider is not configured", code: "AI_NOT_CONFIGURED" },
        503,
      );
    }
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_VISION_MODEL") ?? "gpt-5-mini",
        instructions:
          "Extract only clearly visible veterinary facts. Preserve exact medication names, dosages and ISO dates where possible. Never infer a diagnosis or complete unreadable text. Use null for missing fields and list uncertainty in warnings.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Extract a reviewable health-record draft from this document for ${pet.name}.`,
              },
              { type: "input_image", image_url: imageDataUrl },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "pet_document_extraction",
            strict: true,
            schema: extractionSchema,
          },
        },
        max_output_tokens: 800,
      }),
    });
    if (!aiResponse.ok) {
      console.error(
        "AI vision request failed",
        aiResponse.status,
        (await aiResponse.text()).slice(0, 800),
      );
      return jsonResponse({ error: "Document analysis unavailable" }, 502);
    }
    const extracted = JSON.parse(
      extractOutputText(await aiResponse.json()).trim(),
    );
    const { data: extraction, error: insertError } = await db
      .from("document_extractions")
      .insert({
        owner_id: userId,
        pet_id: petId,
        storage_path: "inline-review-only",
        status: "needs_review",
        document_type: extracted.documentType,
        confidence: extracted.confidence,
        warnings: extracted.warnings,
        extracted_data: extracted,
      })
      .select("id,status,extracted_data,created_at")
      .single();
    if (insertError) throw insertError;
    return jsonResponse({ extraction, requiresConfirmation: true });
  } catch (error) {
    console.error(
      "pet-document-scan",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
