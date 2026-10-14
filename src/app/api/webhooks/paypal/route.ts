import {NextResponse} from "next/server";
import {getPaymentsStatus, readPaymentsEnv} from "@/lib/payments/config";
import {canVerifyPaypalWebhook} from "@/lib/payments/state";

/**
 * PayPal webhook receiver. Verification requires live API credentials, so
 * without configuration every event is rejected before any persistence.
 * COMPLETED is only ever written from a verified webhook, never from browser
 * callbacks (no such route exists).
 */
export async function POST(request: Request) {
  const status = getPaymentsStatus();
  const {secrets} = readPaymentsEnv();
  if (!status.enabled || !canVerifyPaypalWebhook(secrets.paypalClientId, secrets.paypalClientSecret, secrets.paypalWebhookId)) {
    return NextResponse.json({error: "payments_disabled"}, {status: 503});
  }

  const rawBody = await request.text().catch(() => "");
  let payload: {id?: unknown; event_type?: unknown} | null = null;
  try {
    payload = JSON.parse(rawBody) as {id?: unknown; event_type?: unknown};
  } catch {
    return NextResponse.json({error: "invalid_payload"}, {status: 400});
  }
  if (typeof payload?.id !== "string" || typeof payload?.event_type !== "string") {
    return NextResponse.json({error: "invalid_payload"}, {status: 400});
  }

  // Future: verify via PayPal's verify-webhook-signature API before trusting.
  // Until that call exists and succeeds, nothing below may run.
  return NextResponse.json({error: "not_implemented"}, {status: 501});
}
