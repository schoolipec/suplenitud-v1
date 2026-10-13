export const DIRECT_CONTACT_COUNTRIES = ["US", "CA", "MX"] as const;
export type DirectContactCountry = (typeof DIRECT_CONTACT_COUNTRIES)[number];

export const CONTACT_CHANNELS = ["PHONE", "WHATSAPP"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const PRAYER_REQUEST_TYPES = ["PRAYER_ONLY", "PRAYER_AND_CONTACT"] as const;
export type PrayerRequestType = (typeof PRAYER_REQUEST_TYPES)[number];

export const PRAYER_REQUEST_STATUSES = ["NEW", "PENDING_ASSIGNMENT", "ASSIGNED", "CONTACTED", "CLOSED"] as const;
export type PrayerRequestStatus = (typeof PRAYER_REQUEST_STATUSES)[number];

export function isDirectContactCountry(code: string): code is DirectContactCountry {
  return (DIRECT_CONTACT_COUNTRIES as readonly string[]).includes(code);
}

export function getAvailableChannels(country: string): ContactChannel[] {
  if (isDirectContactCountry(country)) {
    return ["PHONE", "WHATSAPP"];
  }
  return ["WHATSAPP"];
}

export function isValidCountryCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z]{2}$/.test(code);
}

export function isValidContactChannel(channel: unknown): channel is ContactChannel {
  return typeof channel === "string" && (CONTACT_CHANNELS as readonly string[]).includes(channel);
}

export function isValidPrayerRequestType(type: unknown): type is PrayerRequestType {
  return typeof type === "string" && (PRAYER_REQUEST_TYPES as readonly string[]).includes(type);
}

export function isValidPrayerRequestStatus(status: unknown): status is PrayerRequestStatus {
  return typeof status === "string" && (PRAYER_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function isValidPhoneNumber(phone: unknown): boolean {
  if (typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^\+?[1-9]\d{6,14}$/.test(cleaned);
}

export function isValidWhatsAppNumber(whatsapp: unknown): boolean {
  if (typeof whatsapp !== "string") return false;
  const cleaned = whatsapp.replace(/[\s\-()]/g, "");
  return /^\+?[1-9]\d{6,14}$/.test(cleaned);
}

export function isValidTimeZone(tz: unknown): boolean {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", {timeZone: tz});
    return true;
  } catch {
    return false;
  }
}

export function isValidMessage(message: unknown): boolean {
  return typeof message === "string" && message.trim().length >= 10 && message.trim().length <= 2000;
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string" || email.length === 0) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isValidName(name: unknown): boolean {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 100;
}

export function isValidAvailabilityWeekday(weekday: unknown): boolean {
  return Number.isInteger(weekday) && (weekday as number) >= 0 && (weekday as number) <= 6;
}

export function isValidTimeFormat(time: unknown): boolean {
  return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function isValidAvailabilityRange(startTime: string, endTime: string): boolean {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) return false;
  return startTime < endTime;
}

export function canTransitionTo(from: PrayerRequestStatus, to: PrayerRequestStatus): boolean {
  if (from === to) return true;
  const transitions: Record<PrayerRequestStatus, PrayerRequestStatus[]> = {
    NEW: ["PENDING_ASSIGNMENT", "ASSIGNED", "CLOSED"],
    PENDING_ASSIGNMENT: ["ASSIGNED", "CLOSED"],
    ASSIGNED: ["CONTACTED", "CLOSED"],
    CONTACTED: ["CLOSED"],
    CLOSED: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function validatePrayerRequest(input: {
  requestType?: unknown;
  message?: unknown;
  name?: unknown;
  email?: unknown;
  consentToStore?: unknown;
  consentToContact?: unknown;
  country?: unknown;
  contactChannel?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  timeZone?: unknown;
  availabilitySlotId?: unknown;
}): {valid: boolean; errors: string[]} {
  const errors: string[] = [];

  if (!isValidPrayerRequestType(input.requestType)) {
    errors.push("invalid_request_type");
  }

  if (!isValidMessage(input.message)) {
    errors.push("invalid_message");
  }

  if (!isValidName(input.name)) {
    errors.push("invalid_name");
  }

  if (!isValidEmail(input.email)) {
    errors.push("invalid_email");
  }

  if (input.consentToStore !== true) {
    errors.push("consent_to_store_required");
  }

  if (input.requestType === "PRAYER_AND_CONTACT") {
    if (input.consentToContact !== true) {
      errors.push("consent_to_contact_required");
    }

    if (!isValidCountryCode(input.country)) {
      errors.push("invalid_country");
    } else {
      const channels = getAvailableChannels(input.country);
      if (!isValidContactChannel(input.contactChannel) || !channels.includes(input.contactChannel)) {
        errors.push("invalid_contact_channel");
      }

      if (input.contactChannel === "PHONE" && !isValidPhoneNumber(input.phone)) {
        errors.push("invalid_phone");
      }

      if (input.contactChannel === "WHATSAPP" && !isValidWhatsAppNumber(input.whatsapp)) {
        errors.push("invalid_whatsapp");
      }
    }

    if (!isValidTimeZone(input.timeZone)) {
      errors.push("invalid_time_zone");
    }

    if (input.availabilitySlotId !== undefined && input.availabilitySlotId !== null && input.availabilitySlotId !== "") {
      if (typeof input.availabilitySlotId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.availabilitySlotId)) {
        errors.push("invalid_availability_slot");
      }
    }
  }

  return {valid: errors.length === 0, errors};
}
