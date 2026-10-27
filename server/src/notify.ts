import { formatINR, site } from "../../lib/site";

// New-lead alerts to the team's Telegram group. Optional: does nothing until
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set (see .env.example).

type NewLead = {
  id: string;
  ref: string;
  name: string;
  mobile: string;
  society: string;
  towerFlat?: string;
  planLabel: string;
  price: number;
  oneTime?: boolean;
  startDate: string;
  callbackRequested?: boolean;
  channel?: string;
};

export async function notifyNewLead(l: NewLead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const adminUrl = (process.env.SITE_URL || site.url) + "/admin/leads/" + l.id;
  const text = [
    `${l.callbackRequested ? "📞 Callback request" : "🚗 New booking"} · ${l.ref}`,
    `${l.name} · +91 ${l.mobile}`,
    `${l.planLabel} · ${formatINR(l.price)}${l.oneTime ? " one-time" : "/month"}`,
    `${l.society}${l.towerFlat ? ", " + l.towerFlat : ""}`,
    `${l.oneTime ? "Date" : "Start"}: ${l.startDate}${l.channel ? ` · Source: ${l.channel}` : ""}`,
    adminUrl,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error("[notify] telegram failed", err);
  }
}
