import type {ApplicationRole} from "@/generated/prisma/client";

export type PrayerAlertRecipient = {
  id: string;
  name: string;
  email: string;
  telegramChatId: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Select external alert recipients for prayer requests. Server-side only:
 * the browser never decides recipients. Rules:
 * - active users only
 * - SUPER_ADMIN or ADMIN roles only (never TREASURER/USHER/ministry contacts)
 * - Telegram requires prayerTelegramAlertsEnabled + a valid numeric chat id
 * - Email copies require prayerEmailCopiesEnabled + a valid email
 * - duplicates removed by user id
 */
export function selectPrayerAlertRecipients(
  users: Array<{
    id: string;
    name: string;
    email: string;
    active: boolean;
    telegramChatId: string | null;
    prayerTelegramAlertsEnabled: boolean;
    prayerEmailCopiesEnabled: boolean;
    roles: Array<{role: ApplicationRole}>;
  }>,
): {telegramChatIds: string[]; emailCopyRecipients: string[]; recipientCount: number} {
  const eligible = users.filter(
    (user) =>
      user.active &&
      user.roles.some((r) => r.role === "SUPER_ADMIN" || r.role === "ADMIN"),
  );

  const seen = new Set<string>();
  const seenChatIds = new Set<string>();
  const seenEmails = new Set<string>();
  const telegramChatIds: string[] = [];
  const emailCopyRecipients: string[] = [];

  for (const user of eligible) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);

    if (
      user.prayerTelegramAlertsEnabled &&
      user.telegramChatId &&
      /^-?\d{1,20}$/.test(user.telegramChatId.trim())
    ) {
      const chatId = user.telegramChatId.trim();
      if (!seenChatIds.has(chatId)) {
        seenChatIds.add(chatId);
        telegramChatIds.push(chatId);
      }
    }

    if (user.prayerEmailCopiesEnabled && EMAIL_PATTERN.test(user.email.trim())) {
      const email = user.email.trim().toLowerCase();
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        emailCopyRecipients.push(email);
      }
    }
  }

  return {telegramChatIds, emailCopyRecipients, recipientCount: seen.size};
}

export function isValidTelegramChatId(value: unknown): boolean {
  return typeof value === "string" && /^-?\d{1,20}$/.test(value.trim());
}
