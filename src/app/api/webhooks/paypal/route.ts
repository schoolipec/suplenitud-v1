import {NextResponse} from "next/server";
import {getPaymentsStatus, readPaymentsEnv} from "@/lib/payments/config";
import {canVerifyPaypalWebhook} from "@/lib/payments/state";

/**
 * PayPal webhook receiver. Rejected 503 without full real configuration.
 * Hosted checkout is not implemented in this phase, so the route answers 501
 * without touching Prisma: no events persisted, no donations changed, no
 * audit written. Signature verification stays available as a pure helper for
 * the future wiring; it is not executed here.
 */
export async function POST() {
  const status = getPaymentsStatus();
  const {secrets} = readPaymentsEnv();
  if (!status.enabled || !canVerifyPaypalWebhook(secrets.paypalClientId, secrets.paypalClientSecret, secrets.paypalWebhookId)) {
    return NextResponse.json({error: "payments_disabled"}, {status: 503});
  }
  return NextResponse.json({error: "not_implemented"}, {status: 501});
}
