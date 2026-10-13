import {randomUUID} from "node:crypto";
import {prisma} from "@/lib/db/client";

export const PRAYER_NOTIFICATION_TYPES = [
  "NEW_PRAYER_REQUEST",
  "NEW_CONTACT_REQUEST",
  "PENDING_ASSIGNMENT",
  "ASSIGNMENT_MADE",
] as const;

export type PrayerNotificationType = (typeof PRAYER_NOTIFICATION_TYPES)[number];

const TYPE_TO_PREFERENCE: Record<PrayerNotificationType, "newPrayerRequest" | "newContactRequest" | "pendingAssignment" | "assignmentMade"> = {
  NEW_PRAYER_REQUEST: "newPrayerRequest",
  NEW_CONTACT_REQUEST: "newContactRequest",
  PENDING_ASSIGNMENT: "pendingAssignment",
  ASSIGNMENT_MADE: "assignmentMade",
};

export function isPrayerNotificationType(value: unknown): value is PrayerNotificationType {
  return typeof value === "string" && (PRAYER_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/**
 * Create internal panel alerts for active SUPER_ADMIN/ADMIN users whose
 * notification preference for `type` is enabled (missing preference row
 * counts as enabled, matching the schema defaults). Never touches external
 * channels. Failures must not break the caller: use inside try/catch.
 */
export async function notifyAdmins(input: {
  type: PrayerNotificationType;
  requestId?: string;
  title: string;
  excludeUserId?: string;
}): Promise<number> {
  const preferenceField = TYPE_TO_PREFERENCE[input.type];
  const assignments = await prisma.userRole.findMany({
    where: {role: {in: ["SUPER_ADMIN", "ADMIN"]}},
    select: {userId: true},
  });
  const candidateIds = [...new Set(assignments.map((a) => a.userId))].filter((id) => id !== input.excludeUserId);
  if (candidateIds.length === 0) return 0;

  const users = await prisma.user.findMany({
    where: {id: {in: candidateIds}, active: true},
    select: {id: true, notificationPreference: {select: {newPrayerRequest: true, newContactRequest: true, pendingAssignment: true, assignmentMade: true}}},
  });

  const recipients = users.filter((user) => user.notificationPreference?.[preferenceField] !== false);
  if (recipients.length === 0) return 0;

  await prisma.prayerNotification.createMany({
    data: recipients.map((user) => ({
      id: randomUUID(),
      userId: user.id,
      type: input.type,
      requestId: input.requestId ?? null,
      title: input.title,
    })),
  });
  return recipients.length;
}
