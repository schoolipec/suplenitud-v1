import {NextResponse} from "next/server";
import {getPaymentsStatus, isProviderId} from "@/lib/payments/config";
import {createPaypalAdapter, createSquareAdapter} from "@/lib/payments/providers";

const CURRENCIES = new Set(["USD", "MXN", "CAD"]);
const MAX_AMOUNT_CENTS = 100_000_000;

/**
 * Public hosted-checkout entry point. While payments are disabled or
 * credentials are missing it answers safely without creating anything.
 * Browser callbacks are never honored: no route here can mark a payment
 * as completed; only verified webhooks move money states.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    amountCents?: unknown;
    currency?: unknown;
    fund?: unknown;
  } | null;

  if (!body || !isProviderId(body.provider)) {
    return NextResponse.json({error: "invalid_provider"}, {status: 400});
  }
  if (
    typeof body.amountCents !== "number" ||
    !Number.isInteger(body.amountCents) ||
    body.amountCents <= 0 ||
    body.amountCents > MAX_AMOUNT_CENTS
  ) {
    return NextResponse.json({error: "invalid_amount"}, {status: 400});
  }
  if (typeof body.currency !== "string" || !CURRENCIES.has(body.currency.toUpperCase())) {
    return NextResponse.json({error: "invalid_currency"}, {status: 400});
  }
  if (body.fund !== undefined && (typeof body.fund !== "string" || body.fund.trim().length === 0 || body.fund.length > 60)) {
    return NextResponse.json({error: "invalid_fund"}, {status: 400});
  }

  const status = getPaymentsStatus();
  const adapter = body.provider === "PAYPAL" ? createPaypalAdapter(getPaymentsStatus) : createSquareAdapter(getPaymentsStatus);
  const result = await adapter.createCheckout({
    amountCents: body.amountCents,
    currency: body.currency.toUpperCase(),
    fund: typeof body.fund === "string" ? body.fund.trim() : undefined,
  });
  if (!result.ok) {
    return NextResponse.json({error: result.reason}, {status: result.reason === "not_implemented" ? 501 : 503});
  }
  return NextResponse.json({approvalUrl: result.approvalUrl, externalReference: result.externalReference});
}
