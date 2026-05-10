/**
 * WhatsApp delivery wrapper. Provider-agnostic: routes to whichever
 * WhatsApp Business API credentials are present in env. Designed for
 * the SEA/Malaysia market where 28M+ users and 7-in-10 SMEs prefer
 * messaging over email.
 *
 * Currently supported providers (in priority order):
 *  - Twilio        (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM)
 *  - 360dialog     (DIALOG_360_API_KEY)
 *  - Wassenger     (WASSENGER_API_KEY)
 *
 * If no provider is configured the function returns { ok: false,
 * skipped: true } — caller treats it as soft-fail (log + continue).
 */

interface SendResult {
  ok: boolean;
  provider?: string;
  messageId?: string;
  skipped?: boolean;
  error?: string;
}

export interface WhatsAppMessage {
  to: string; // E.164 e.g. +60123456789
  body: string;
  template?: { name: string; language: string; components?: unknown };
}

function normaliseNumber(num: string): string {
  // Strip everything except + and digits
  const cleaned = num.replace(/[^\d+]/g, "");
  // MY local format conversion: 0123456789 → +60123456789
  if (cleaned.startsWith("0") && cleaned.length >= 10) return `+60${cleaned.slice(1)}`;
  if (!cleaned.startsWith("+")) return `+${cleaned}`;
  return cleaned;
}

async function sendViaTwilio(msg: WhatsAppMessage): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
  if (!sid || !token || !from) return { ok: false, skipped: true };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    From: from,
    To: `whatsapp:${normaliseNumber(msg.to)}`,
    Body: msg.body,
  });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "twilio", error: body?.message ?? `HTTP ${r.status}` };
  return { ok: true, provider: "twilio", messageId: body?.sid };
}

async function sendVia360dialog(msg: WhatsAppMessage): Promise<SendResult> {
  const key = process.env.DIALOG_360_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const r = await fetch("https://waba-v2.360dialog.io/messages", {
    method: "POST",
    headers: {
      "D360-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normaliseNumber(msg.to).replace(/^\+/, ""),
      type: "text",
      text: { body: msg.body },
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "360dialog", error: body?.error?.message ?? `HTTP ${r.status}` };
  return { ok: true, provider: "360dialog", messageId: body?.messages?.[0]?.id };
}

async function sendViaWassenger(msg: WhatsAppMessage): Promise<SendResult> {
  const key = process.env.WASSENGER_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const r = await fetch("https://api.wassenger.com/v1/messages", {
    method: "POST",
    headers: { Token: key, "Content-Type": "application/json" },
    body: JSON.stringify({ phone: normaliseNumber(msg.to), message: msg.body }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "wassenger", error: body?.message ?? `HTTP ${r.status}` };
  return { ok: true, provider: "wassenger", messageId: body?.id };
}

export async function sendWhatsApp(msg: WhatsAppMessage): Promise<SendResult> {
  if (!msg.to || !msg.body?.trim()) return { ok: false, error: "Missing to/body" };
  // Try in priority order; first configured provider wins.
  const providers = [sendViaTwilio, sendVia360dialog, sendViaWassenger];
  for (const fn of providers) {
    const result = await fn(msg).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    }));
    if (result.skipped) continue;
    return result;
  }
  return { ok: false, skipped: true };
}

/**
 * Format a daily-digest message for a brand. Bahasa Melayu by default
 * because the SEA agencies' clients expect it.
 */
export function buildDailyDigest(opts: {
  brandName: string;
  agencyName: string;
  spend: number;
  conversions: number;
  roas: number;
  dashboardUrl: string;
  language?: "ms" | "en";
}): string {
  const lang = opts.language ?? "ms";
  if (lang === "ms") {
    return [
      `Update harian dari ${opts.agencyName} 👋`,
      ``,
      `*${opts.brandName}* — semalam:`,
      `• Spend: RM ${opts.spend.toFixed(0)}`,
      `• Conversions: ${opts.conversions}`,
      `• ROAS: ${opts.roas > 0 ? `${opts.roas.toFixed(2)}×` : "—"}`,
      ``,
      `Dashboard penuh: ${opts.dashboardUrl}`,
    ].join("\n");
  }
  return [
    `Daily update from ${opts.agencyName} 👋`,
    ``,
    `*${opts.brandName}* — yesterday:`,
    `• Spend: RM ${opts.spend.toFixed(0)}`,
    `• Conversions: ${opts.conversions}`,
    `• ROAS: ${opts.roas > 0 ? `${opts.roas.toFixed(2)}×` : "—"}`,
    ``,
    `Full dashboard: ${opts.dashboardUrl}`,
  ].join("\n");
}
