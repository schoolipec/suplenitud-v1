export const PAYMENT_PROVIDERS = ["PAYPAL", "SQUARE"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export type PaymentsMode = "sandbox" | "live";

export type ProviderReadiness = "disabled" | "missing_credentials" | "sandbox_ready" | "live_ready";

export type PaymentsStatus = {
  enabled: boolean;
  mode: PaymentsMode;
  paypal: ProviderReadiness;
  square: ProviderReadiness;
};

export type PaymentsSecrets = {
  paypalClientId: string;
  paypalClientSecret: string;
  paypalWebhookId: string;
  squareApplicationId: string;
  squareLocationId: string;
  squareAccessToken: string;
  squareWebhookSignatureKey: string;
  squareWebhookNotificationUrl: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const PLACEHOLDER_MARKERS = ["changeme", "example", "replace", "placeholder"];

/**
 * Placeholders are never credentials: empty values, CHANGE_ME and anything
 * containing example/replace/placeholder (any case) count as missing. This
 * keeps template values from ever flipping a provider to ready.
 */
export function isMissingSecret(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length === 0) return true;
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function present(value: string): boolean {
  return !isMissingSecret(value);
}

/** Server-only full configuration. Never serialize or return this to the client. */
export function readPaymentsEnv(env: NodeJS.ProcessEnv = process.env): {
  enabled: boolean;
  mode: PaymentsMode;
  secrets: PaymentsSecrets;
} {
  return {
    enabled: env.PAYMENTS_ENABLED === "true",
    mode: env.PAYMENTS_MODE === "live" ? "live" : "sandbox",
    secrets: {
      paypalClientId: text(env.PAYPAL_CLIENT_ID),
      paypalClientSecret: text(env.PAYPAL_CLIENT_SECRET ?? ""),
      paypalWebhookId: text(env.PAYPAL_WEBHOOK_ID),
      squareApplicationId: text(env.SQUARE_APPLICATION_ID),
      squareLocationId: text(env.SQUARE_LOCATION_ID),
      squareAccessToken: text(env.SQUARE_ACCESS_TOKEN ?? ""),
      squareWebhookSignatureKey: text(env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ""),
      squareWebhookNotificationUrl: text(env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? ""),
    },
  };
}

function paypalReadiness(enabled: boolean, mode: PaymentsMode, secrets: PaymentsSecrets): ProviderReadiness {
  if (!enabled) return "disabled";
  if (!present(secrets.paypalClientId) || !present(secrets.paypalClientSecret) || !present(secrets.paypalWebhookId)) {
    return "missing_credentials";
  }
  return mode === "live" ? "live_ready" : "sandbox_ready";
}

function squareReadiness(enabled: boolean, mode: PaymentsMode, secrets: PaymentsSecrets): ProviderReadiness {
  if (!enabled) return "disabled";
  if (
    !present(secrets.squareApplicationId) ||
    !present(secrets.squareLocationId) ||
    !present(secrets.squareAccessToken) ||
    !present(secrets.squareWebhookSignatureKey) ||
    !present(secrets.squareWebhookNotificationUrl)
  ) {
    return "missing_credentials";
  }
  return mode === "live" ? "live_ready" : "sandbox_ready";
}

/** Full real configuration gate for the Square webhook path (never derived from request headers). */
export function isSquareConfigured(secrets: PaymentsSecrets): boolean {
  return (
    present(secrets.squareApplicationId) &&
    present(secrets.squareLocationId) &&
    present(secrets.squareAccessToken) &&
    present(secrets.squareWebhookSignatureKey) &&
    present(secrets.squareWebhookNotificationUrl)
  );
}

/**
 * Safe subset for UI and diagnostics. Contains readiness labels only;
 * secret values can never leak through this shape.
 */
export function getPaymentsStatus(env: NodeJS.ProcessEnv = process.env): PaymentsStatus {
  const {enabled, mode, secrets} = readPaymentsEnv(env);
  return {
    enabled,
    mode,
    paypal: paypalReadiness(enabled, mode, secrets),
    square: squareReadiness(enabled, mode, secrets),
  };
}

export function isProviderId(value: unknown): value is PaymentProviderId {
  return value === "PAYPAL" || value === "SQUARE";
}
