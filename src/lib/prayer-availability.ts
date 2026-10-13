import {isValidTimeZone, type ContactChannel} from "@/lib/prayer-validation";

export type AvailabilitySource = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  contactTimezone: string;
  active: boolean;
  contactActive: boolean;
  contactAuthorized: boolean;
  contactPhone: string | null;
  contactWhatsapp: string | null;
};

export type PublicAvailabilitySlot = {
  id: string;
  label: string;
  date: string;
  startTime: string;
  endTime: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes to add to a UTC instant to obtain wall-clock time in `timeZone`. */
export function getTimeZoneOffsetMinutes(timeZone: string, utcDate: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - utcDate.getTime()) / 60000);
}

/** Resolve wall-clock date+time in `timeZone` to a UTC instant. */
export function wallTimeToUtc(year: number, month: number, day: number, time: string, timeZone: string): Date {
  const [hh, mm] = time.split(":").map(Number);
  let utc = Date.UTC(year, month - 1, day, hh, mm);
  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMinutes(timeZone, new Date(utc));
    const next = Date.UTC(year, month - 1, day, hh, mm) - offset * 60000;
    if (next === utc) break;
    utc = next;
  }
  return new Date(utc);
}

function ymdInTimeZone(date: Date, timeZone: string): {year: number; month: number; day: number; weekday: number} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayMap: Record<string, number> = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};
  return {year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekday: dayMap[get("weekday")] ?? 0};
}

function addDays(year: number, month: number, day: number, delta: number): {year: number; month: number; day: number} {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return {year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate()};
}

function formatInTimeZone(date: Date, timeZone: string): {label: string; date: string; startTime: string; weekday: number} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayMap: Record<string, number> = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};
  const hh24 = new Intl.DateTimeFormat("en-US", {timeZone, hour: "2-digit", minute: "2-digit", hour12: false})
    .format(date);
  return {
    label: `${get("weekday")}, ${get("month")} ${get("day")} · ${get("hour")}:${get("minute")} ${get("dayPeriod")}`,
    date: `${get("year")}-${String(new Date(`${get("month")} 1, ${get("year")}`).getMonth() + 1).padStart(2, "0")}-${get("day").padStart(2, "0")}`,
    startTime: hh24,
    weekday: dayMap[get("weekday")] ?? 0,
  };
}

/**
 * Build the public label for a weekly availability window, converting from the
 * contact's time zone to the visitor's time zone using real UTC instants.
 * Returns the next occurrence on/after `referenceDate`.
 */
export function buildPublicSlot(
  availability: Pick<AvailabilitySource, "id" | "weekday" | "startTime" | "endTime" | "contactTimezone">,
  visitorTimeZone: string,
  referenceDate: Date = new Date(),
): PublicAvailabilitySlot | null {
  if (!isValidTimeZone(visitorTimeZone) || !isValidTimeZone(availability.contactTimezone)) return null;
  const ref = ymdInTimeZone(referenceDate, availability.contactTimezone);
  let occurrence: {year: number; month: number; day: number} | null = null;
  for (let delta = 0; delta < 8; delta += 1) {
    const candidate = addDays(ref.year, ref.month, ref.day, delta);
    if (new Date(Date.UTC(candidate.year, candidate.month - 1, candidate.day)).getUTCDay() === availability.weekday) {
      if (delta === 0 && parseMinutes(availability.endTime) <= refTimeMinutes(referenceDate, availability.contactTimezone)) {
        continue;
      }
      occurrence = candidate;
      break;
    }
  }
  if (!occurrence) return null;
  const startUtc = wallTimeToUtc(occurrence.year, occurrence.month, occurrence.day, availability.startTime, availability.contactTimezone);
  const endUtc = wallTimeToUtc(occurrence.year, occurrence.month, occurrence.day, availability.endTime, availability.contactTimezone);
  const startFmt = formatInTimeZone(startUtc, visitorTimeZone);
  const endFmt = new Intl.DateTimeFormat("en-US", {timeZone: visitorTimeZone, hour: "numeric", minute: "2-digit", hour12: true}).format(endUtc);
  return {
    id: availability.id,
    label: `Next ${startFmt.label} – ${endFmt} (your time)`,
    date: startFmt.date,
    startTime: startFmt.startTime,
    endTime: new Intl.DateTimeFormat("en-US", {timeZone: visitorTimeZone, hour: "2-digit", minute: "2-digit", hour12: false}).format(endUtc),
  };
}

function refTimeMinutes(referenceDate: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {timeZone, hour: "2-digit", minute: "2-digit", hour12: false}).formatToParts(referenceDate);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return get("hour") * 60 + get("minute");
}

export function isSlotCompatibleWithChannel(
  slot: Pick<AvailabilitySource, "active" | "contactActive" | "contactAuthorized" | "contactPhone" | "contactWhatsapp">,
  channel: ContactChannel,
): boolean {
  if (!slot.active || !slot.contactActive || !slot.contactAuthorized) return false;
  if (channel === "PHONE") return Boolean(slot.contactPhone?.trim());
  return Boolean(slot.contactWhatsapp?.trim());
}

export function validateAvailabilitySlotForChannel(
  slot: Pick<AvailabilitySource, "active" | "contactActive" | "contactAuthorized" | "contactPhone" | "contactWhatsapp"> | null,
  channel: ContactChannel,
): {ok: boolean; reason: string} {
  if (!slot) return {ok: false, reason: "slot_not_found"};
  if (!slot.active) return {ok: false, reason: "slot_inactive"};
  if (!slot.contactActive || !slot.contactAuthorized) return {ok: false, reason: "contact_not_authorized"};
  if (!isSlotCompatibleWithChannel(slot, channel)) return {ok: false, reason: "channel_not_available"};
  return {ok: true, reason: "ok"};
}
