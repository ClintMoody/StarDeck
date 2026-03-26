import { createNotification, getSetting } from "@/lib/queries";

interface NotificationPayload {
  repoId?: number | null;
  type: string;
  title: string;
  message?: string;
}

/**
 * Send a notification through all configured channels.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // Always create in-app notification
  createNotification(payload);

  // System notification (macOS)
  const systemEnabled = getSetting("notifications_system");
  if (systemEnabled === "true") {
    sendSystemNotification(payload.title, payload.message);
  }

  // Telegram
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = getSetting("telegram_chat_id");
  if (telegramToken && telegramChatId) {
    sendTelegramNotification(telegramToken, telegramChatId, payload.title, payload.message);
  }
}

async function sendSystemNotification(title: string, message?: string): Promise<void> {
  try {
    // Dynamic import to avoid issues on non-macOS systems
    const notifier = await import("node-notifier");
    notifier.default.notify({
      title: "StarDeck",
      message: message ? `${title}\n${message}` : title,
      sound: true,
    });
  } catch {
    // node-notifier not installed or not on macOS — silently skip
  }
}

async function sendTelegramNotification(
  token: string,
  chatId: string,
  title: string,
  message?: string
): Promise<void> {
  const text = message ? `*${title}*\n${message}` : `*${title}*`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch {
    // Non-fatal — log and continue
  }
}

/**
 * Send email digest (called by scheduled task).
 * Only sends if SMTP is configured.
 */
export async function sendEmailDigest(
  subject: string,
  htmlBody: string
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailTo = getSetting("email_address");

  if (!smtpHost || !emailTo) return;

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort ? parseInt(smtpPort, 10) : 587,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    await transport.sendMail({
      from: smtpUser ?? "stardeck@localhost",
      to: emailTo,
      subject,
      html: htmlBody,
    });
  } catch {
    // Non-fatal
  }
}
