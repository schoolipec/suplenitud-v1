import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {getPaymentsStatus, readPaymentsEnv} from "@/lib/payments/config";
import {
  canTransitionDonation,
  squarePaymentStatus,
  verifySquareSignature,
  webhookEventKey,
} from "@/lib/payments/state";
import type {DonationStatus} from "@/lib/payments/state";

type SquarePayload = {
  event_id?: unknown;
  type?: unknown;
  data?: {object?: {payment?: {id?: unknown; status?: unknown}}};
};

/**
 * Square webhook receiver. The HMAC signature is verified against the raw
 * body before anything is persisted; invalid signatures are rejected without
 * writes. Verified events are ledgered idempotently and only valid
 * transitions are applied. COMPLETED is only ever written here.
 */
export async function POST(request: Request) {
  const status = getPaymentsStatus();
  const {secrets} = readPaymentsEnv();
  if (!status.enabled || !secrets.squareWebhookSignatureKey) {
    return NextResponse.json({error: "payments_disabled"}, {status: 503});
  }

  const rawBody = await request.text().catch(() => "");
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";
  if (!verifySquareSignature({payload: rawBody, signature, signatureKey: secrets.squareWebhookSignatureKey})) {
    return NextResponse.json({error: "invalid_signature"}, {status: 401});
  }

  let payload: SquarePayload | null = null;
  try {
    payload = JSON.parse(rawBody) as SquarePayload;
  } catch {
    return NextResponse.json({error: "invalid_payload"}, {status: 400});
  }
  const eventId = typeof payload?.event_id === "string" ? payload.event_id : null;
  const payment = payload?.data?.object?.payment;
  const paymentId = typeof payment?.id === "string" ? payment.id : null;
  const paymentStatus = typeof payment?.status === "string" ? payment.status : "";
  if (!eventId || !paymentId) {
    return NextResponse.json({error: "invalid_payload"}, {status: 400});
  }

  const existing = await prisma.donationWebhookEvent.findUnique({
    where: {provider_externalId: {provider: "SQUARE", externalId: eventId}},
  });
  if (existing?.processed) {
    return NextResponse.json({duplicate: true});
  }

  const target: DonationStatus | null = squarePaymentStatus(paymentStatus);
  const donation = await prisma.donation.findUnique({where: {externalReference: paymentId}});

  const event = existing
    ? await prisma.donationWebhookEvent.update({
        where: {id: existing.id},
        data: {verified: true, eventType: paymentStatus, donationId: donation?.id ?? null},
      })
    : await prisma.donationWebhookEvent.create({
        data: {
          provider: "SQUARE",
          externalId: eventId,
          eventType: paymentStatus,
          verified: true,
          donationId: donation?.id ?? null,
        },
      });

  let applied: DonationStatus | null = null;
  if (donation && target && canTransitionDonation(donation.status, target)) {
    await prisma.donation.update({
      where: {id: donation.id},
      data: {
        status: target,
        reconciledAt: target === "COMPLETED" || target === "REFUNDED" ? new Date() : donation.reconciledAt,
      },
    });
    applied = target;
  }

  await prisma.donationWebhookEvent.update({
    where: {id: event.id},
    data: {processed: true, processedAt: new Date()},
  });
  await prisma.auditLog.create({
    data: {
      action: "DONATION_WEBHOOK_PROCESSED",
      resource: "donation_webhook_event",
      resourceId: event.id,
      metadata: {key: webhookEventKey("SQUARE", eventId), applied},
    },
  });

  return NextResponse.json({processed: true, applied});
}
