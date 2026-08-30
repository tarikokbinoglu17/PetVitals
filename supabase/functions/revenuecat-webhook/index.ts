import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const JSON_HEADERS = { "Content-Type": "application/json" };
const PRO_ENTITLEMENT = "pawly_pro";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_id?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_id?: string;
  entitlement_ids?: string[];
  product_id?: string;
  store?: string;
  expiration_at_ms?: number | null;
  transferred_from?: string[];
  transferred_to?: string[];
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

function uuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function containsPro(event: RevenueCatEvent) {
  return (
    event.entitlement_id === PRO_ENTITLEMENT ||
    event.entitlement_ids?.includes(PRO_ENTITLEMENT) === true
  );
}

function activeForEvent(event: RevenueCatEvent) {
  if (event.type === "EXPIRATION") return false;
  if (event.type === "CANCELLATION" || event.type === "SUBSCRIPTION_PAUSED") {
    return typeof event.expiration_at_ms === "number"
      ? event.expiration_at_ms > Date.now()
      : true;
  }
  return [
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "NON_RENEWING_PURCHASE",
    "BILLING_ISSUE",
    "PRODUCT_CHANGE",
    "SUBSCRIPTION_EXTENDED",
    "REFUND_REVERSED",
    "TEMPORARY_ENTITLEMENT_GRANT",
    "PURCHASE_REDEEMED",
  ].includes(event.type ?? "");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const expectedAuthorization = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expectedAuthorization) {
    console.error("REVENUECAT_WEBHOOK_AUTH is missing");
    return response({ error: "Webhook is not configured" }, 503);
  }
  if (req.headers.get("Authorization") !== expectedAuthorization) {
    return response({ error: "Unauthorized" }, 401);
  }
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 1024 * 1024) {
    return response({ error: "Payload too large" }, 413);
  }

  try {
    const payload = await req.json();
    const event = payload?.event as RevenueCatEvent | undefined;
    if (!event?.id || !event.type) {
      return response({ error: "Invalid RevenueCat event" }, 400);
    }
    const expectedAppId = Deno.env.get("REVENUECAT_APP_ID");
    if (expectedAppId && event.app_id && event.app_id !== expectedAppId) {
      return response({ error: "Unexpected RevenueCat app" }, 403);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: existing } = await db
      .from("billing_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing) return response({ received: true, duplicate: true });

    const applyAccess = async (userId: string, subscribed: boolean) => {
      const expiresAt =
        typeof event.expiration_at_ms === "number"
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
      const now = new Date().toISOString();
      const [{ error: accessError }, { error: entitlementError }] =
        await Promise.all([
          db.from("subscription_access").upsert(
            { user_id: userId, subscribed, updated_at: now },
            { onConflict: "user_id" },
          ),
          db.from("pro_entitlements").upsert(
            {
              user_id: userId,
              plan: subscribed ? "pro" : "free",
              provider: "revenuecat",
              product_id: event.product_id ?? null,
              expires_at: expiresAt,
              updated_at: now,
            },
            { onConflict: "user_id" },
          ),
        ]);
      if (accessError) throw accessError;
      if (entitlementError) throw entitlementError;
    };

    if (event.type === "TRANSFER") {
      const from = (event.transferred_from ?? []).map(uuid).filter(Boolean) as string[];
      const to = (event.transferred_to ?? []).map(uuid).filter(Boolean) as string[];
      await Promise.all([
        ...from.map((userId) => applyAccess(userId, false)),
        ...to.map((userId) => applyAccess(userId, true)),
      ]);
    } else if (containsPro(event)) {
      const userId =
        uuid(event.app_user_id) ??
        uuid(event.original_app_user_id) ??
        (event.aliases ?? []).map(uuid).find(Boolean) ??
        null;
      if (!userId) {
        return response({ error: "App user ID is not a Supabase UUID" }, 422);
      }
      await applyAccess(userId, activeForEvent(event));
    }

    const { error: eventError } = await db.from("billing_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      app_user_id: uuid(event.app_user_id),
      payload,
    });
    if (eventError && eventError.code !== "23505") throw eventError;
    return response({ received: true });
  } catch (error) {
    console.error("revenuecat-webhook", error);
    return response({ error: "Webhook processing failed" }, 500);
  }
});
