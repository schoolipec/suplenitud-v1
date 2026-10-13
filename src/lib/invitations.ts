import {createHash, randomBytes, timingSafeEqual} from "node:crypto";

export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
export const INVITATION_MIN_PASSWORD_LENGTH = 8;

export type InvitationStatus = "valid" | "expired" | "used" | "revoked";

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function invitationExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITATION_TTL_MS);
}

export function getInvitationStatus(input: {
  usedAt: Date | string | null;
  revokedAt: Date | string | null;
  expiresAt: Date | string;
  now?: Date | string;
}): InvitationStatus {
  if (input.usedAt) return "used";
  if (input.revokedAt) return "revoked";
  const now = input.now ? new Date(input.now).getTime() : Date.now();
  if (new Date(input.expiresAt).getTime() <= now) return "expired";
  return "valid";
}

export function isInvitationUsable(input: {
  usedAt: Date | string | null;
  revokedAt: Date | string | null;
  expiresAt: Date | string;
  now?: Date | string;
}): boolean {
  return getInvitationStatus(input) === "valid";
}

export function isAcceptablePassword(password: unknown): boolean {
  return typeof password === "string" && password.length >= INVITATION_MIN_PASSWORD_LENGTH && password.length <= 128;
}
