export type PrayerExternalNotificationInput = {
  id: string;
  name: string;
  message: string;
  createdAt: Date;
  telegramChatId: string | null;
};

type PrayerWebhookConfig = {
  url: string;
  secret: string;
};

function configuredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * External delivery is deliberately opt-in. Secrets stay only in the
 * deployment environment and are never serialized to the browser.
 */
export function getPrayerWebhookConfig(env: Record<string, string | undefined> = process.env): PrayerWebhookConfig | null {
  const url = configuredText(env.PRAYER_NOTIFICATION_WEBHOOK_URL);
  const secret = configuredText(env.PRAYER_NOTIFICATION_WEBHOOK_SECRET);
  if (!url || !secret) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return {url: parsed.toString(), secret};
  } catch {
    return null;
  }
}

export async function notifyPrayerDelivery(
  input: PrayerExternalNotificationInput,
  env: Record<string, string | undefined> = process.env,
  request = fetch,
): Promise<boolean> {
  const config = getPrayerWebhookConfig(env);
  if (!config) return false;

  try {
    const response = await request(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ipec-prayer-secret": config.secret,
      },
      body: JSON.stringify({
        id: input.id,
        name: input.name,
        message: input.message,
        createdAt: input.createdAt.toISOString(),
        telegramChatId: configuredText(input.telegramChatId) || null,
      }),
      signal: AbortSignal.timeout(2_500),
    });
    return response.ok;
  } catch {
    return false;
  }
}
