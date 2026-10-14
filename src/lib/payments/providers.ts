import type {PaymentProviderId, PaymentsStatus} from "@/lib/payments/config";

export type CheckoutInput = {
  provider: PaymentProviderId;
  amountCents: number;
  currency: string;
  fund?: string;
};

export type CheckoutResult =
  | {ok: true; approvalUrl: string; externalReference: string}
  | {ok: false; reason: "payments_disabled" | "missing_credentials" | "not_implemented"};

/**
 * Common provider interface for hosted checkout. While no credentials exist
 * every adapter stays inactive: checkout reports disabled/missing credentials
 * and never fabricates approval URLs or performs real calls.
 */
export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readiness(status: PaymentsStatus): "disabled" | "missing_credentials" | "ready";
  createCheckout(input: Omit<CheckoutInput, "provider">): Promise<CheckoutResult>;
}

function inactiveResult(status: PaymentsStatus, provider: PaymentProviderId): CheckoutResult {
  if (!status.enabled) return {ok: false, reason: "payments_disabled"};
  const readiness = provider === "PAYPAL" ? status.paypal : status.square;
  if (readiness === "missing_credentials" || readiness === "disabled") return {ok: false, reason: "missing_credentials"};
  return {ok: false, reason: "not_implemented"};
}

export function createPaypalAdapter(getStatus: () => PaymentsStatus): PaymentProvider {
  return {
    id: "PAYPAL",
    readiness: (status) => {
      if (!status.enabled) return "disabled";
      return status.paypal === "sandbox_ready" || status.paypal === "live_ready" ? "ready" : "missing_credentials";
    },
    createCheckout: async () => inactiveResult(getStatus(), "PAYPAL"),
  };
}

export function createSquareAdapter(getStatus: () => PaymentsStatus): PaymentProvider {
  return {
    id: "SQUARE",
    readiness: (status) => {
      if (!status.enabled) return "disabled";
      return status.square === "sandbox_ready" || status.square === "live_ready" ? "ready" : "missing_credentials";
    },
    createCheckout: async () => inactiveResult(getStatus(), "SQUARE"),
  };
}
