import { formatINR, site } from "../../lib/site";

// Alerts to the team's Telegram group (new leads, payments). Optional: does nothing until
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set (see .env.example).

/** The website's address, for links in alerts and Razorpay's return page. */
export const siteUrl = () => (process.env.SITE_URL || site.url).replace(/\/$/, "");

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
  await send([
    `${l.callbackRequested ? "📞 Callback request" : "🚗 New booking"} · ${l.ref}`,
    `${l.name} · +91 ${l.mobile}`,
    `${l.planLabel} · ${formatINR(l.price)}${l.oneTime ? " one-time" : "/month"}`,
    `${l.society}${l.towerFlat ? ", " + l.towerFlat : ""}`,
    `${l.oneTime ? "Date" : "Start"}: ${l.startDate}${l.channel ? ` · Source: ${l.channel}` : ""}`,
    siteUrl() + "/admin/leads/" + l.id,
  ]);
}

export async function notifyPayment(p: { id: string; ref: string; name: string; amount: string; method?: string }) {
  await send([
    `💰 Payment received · ${p.ref}`,
    `${p.name} · ${p.amount}${p.method ? " · " + p.method.toUpperCase() : ""}`,
    siteUrl() + "/admin/leads/" + p.id,
  ]);
}

async function send(lines: string[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error("[notify] telegram failed", err);
  }
}
