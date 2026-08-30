import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cron-secret",
};

const PUSH_CONSENT_VERSION = "2026-08-20";

type ReminderRow = {
  id: string;
  owner_id: string;
  attempt_count: number;
};

type PushDeviceRow = {
  expo_push_token: string;
  locale: "tr" | "en" | "de" | "es" | "ja";
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

const copy = {
  tr: {
    title: "Pawly hatırlatması",
    body: "Yaklaşan bir sağlık hatırlatmanız var. Ayrıntılar için Pawly’ı açın.",
  },
  en: {
    title: "Pawly reminder",
    body: "You have an upcoming health reminder. Open Pawly for details.",
  },
  de: {
    title: "Pawly-Erinnerung",
    body: "Eine Gesundheitserinnerung steht an. Öffne Pawly für Details.",
  },
  es: {
    title: "Recordatorio de Pawly",
    body: "Tienes un recordatorio de salud próximo. Abre Pawly para ver los detalles.",
  },
  ja: {
    title: "Pawlyのリマインダー",
    body: "まもなく健康管理の予定があります。詳しくはPawlyを開いてください。",
  },
} as const;

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildMessage(locale: PushDeviceRow["locale"]) {
  return copy[locale] ?? copy.en;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration" }, 500);

  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: storedSecret, error: secretError } = await admin
    .from("function_secrets")
    .select("secret_hash")
    .eq("name", "send-reminders")
    .maybeSingle();
  if (secretError || !storedSecret) return json({ error: "server_configuration" }, 500);
  if (!constantTimeEqual(await sha256(cronSecret), storedSecret.secret_hash)) {
    return json({ error: "unauthorized" }, 401);
  }

  const now = new Date();
  const staleLock = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  await admin
    .from("reminders")
    .update({ status: "scheduled", locked_at: null, last_error: "stale_lock_recovered" })
    .eq("status", "processing")
    .lt("locked_at", staleLock)
    .lt("attempt_count", 5);
  await admin
    .from("reminders")
    .update({ status: "failed", locked_at: null, last_error: "retry_limit_reached" })
    .eq("status", "processing")
    .lt("locked_at", staleLock)
    .gte("attempt_count", 5);

  const oldestAllowed = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dueRows, error: dueError } = await admin
    .from("reminders")
    .select("id,owner_id,attempt_count")
    .eq("status", "scheduled")
    .lte("remind_at", now.toISOString())
    .gte("remind_at", oldestAllowed)
    .order("remind_at", { ascending: true })
    .limit(100);
  if (dueError) return json({ error: "query_failed" }, 500);

  let sent = 0;
  let retried = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of (dueRows ?? []) as ReminderRow[]) {
    const { data: devices, error: deviceError } = await admin
      .from("device_push_tokens")
      .select("expo_push_token,locale")
      .eq("owner_id", reminder.owner_id)
      .eq("enabled", true)
      .eq("consent_version", PUSH_CONSENT_VERSION)
      .not("consented_at", "is", null)
      .limit(100);
    if (deviceError || !devices?.length) {
      skipped += 1;
      continue;
    }

    const { data: claimed, error: claimError } = await admin
      .from("reminders")
      .update({
        status: "processing",
        locked_at: now.toISOString(),
        attempt_count: reminder.attempt_count + 1,
        last_error: null,
      })
      .eq("id", reminder.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) {
      skipped += 1;
      continue;
    }

    try {
      const pushDevices = devices as PushDeviceRow[];
      const messages = pushDevices.map((device) => {
        const message = buildMessage(device.locale);
        return {
          to: device.expo_push_token,
          sound: "default",
          title: message.title,
          body: message.body,
          data: {
            screen: "health",
          },
        };
      });

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      if (!response.ok) throw new Error(`expo_http_${response.status}`);

      const payload = await response.json() as { data?: ExpoPushTicket[] };
      const tickets = payload.data ?? [];
      let firstTicketId: string | null = null;
      let delivered = false;
      for (let index = 0; index < tickets.length; index += 1) {
        const ticket = tickets[index];
        if (ticket.status === "ok") {
          delivered = true;
          firstTicketId ??= ticket.id ?? null;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          await admin
            .from("device_push_tokens")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("expo_push_token", pushDevices[index]?.expo_push_token ?? "");
        }
      }

      if (!delivered) throw new Error("expo_delivery_rejected");
      await admin
        .from("reminders")
        .update({
          status: "sent",
          locked_at: null,
          notification_id: firstTicketId,
          last_error: null,
        })
        .eq("id", reminder.id)
        .eq("status", "processing");
      sent += 1;
    } catch (error) {
      const exhausted = reminder.attempt_count + 1 >= 5;
      await admin
        .from("reminders")
        .update({
          status: exhausted ? "failed" : "scheduled",
          locked_at: null,
          last_error: error instanceof Error ? error.message.slice(0, 160) : "unknown_error",
        })
        .eq("id", reminder.id)
        .eq("status", "processing");
      if (exhausted) failed += 1;
      else retried += 1;
    }
  }

  return json({ processed: (dueRows ?? []).length, sent, retried, failed, skipped }, 200);
});
