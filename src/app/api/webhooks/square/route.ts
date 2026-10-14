import {NextResponse} from "next/server";
import {getPaymentsStatus, isSquareConfigured, readPaymentsEnv} from "@/lib/payments/config";

/**
 * Square webhook receiver. Rejected 503 without full real configuration.
 * Hosted checkout is not implemented in this phase, so the route answers 501
 * without touching Prisma: no signature check against live data, no events
 * persisted, no donations changed, no audit written. The HMAC helper stays
 * pure and tested; the transactional processor lives in
 * `src/lib/payments/square.ts` and is not called yet.
 */
export async function POST() {
  const status = getPaymentsStatus();
  const {secrets} = readPaymentsEnv();
  if (!status.enabled || !isSquareConfigured(secrets)) {
    return NextResponse.json({error: "payments_disabled"}, {status: 503});
  }
  return NextResponse.json({error: "not_implemented"}, {status: 501});
}
