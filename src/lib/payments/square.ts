import {prisma} from "@/lib/db/client";
import {canTransitionDonation, isUniqueViolation, squarePaymentStatus} from "@/lib/payments/state";
import type {DonationStatus} from "@/lib/payments/state";

export type SquareProcessingResult =
  | {duplicate: true}
  | {processed: true; applied: DonationStatus | null};

/**
 * Future Square webhook processor. NOT called by any route while hosted
 * checkout stays unimplemented: routes answer 501 before touching Prisma.
 * When wired, this single transaction creates the ledger row, locates the
 * donation scoped to provider SQUARE plus the external payment reference
 * (never touching another provider's records), applies only valid
 * transitions, marks the event processed and writes the audit row
 * atomically. A concurrent duplicate hits UNIQUE(provider, external_id)
 * and answers as a duplicate without repeated effects.
 */
export async function processSquareWebhookEvent(input: {
  eventId: string;
  paymentId: string;
  paymentStatus: string;
}): Promise<SquareProcessingResult> {
  const target: DonationStatus | null = squarePaymentStatus(input.paymentStatus);
  try {
    const applied = await prisma.$transaction(async (tx) => {
      const event = await tx.donationWebhookEvent.create({
        data: {
          provider: "SQUARE",
          externalId: input.eventId,
          eventType: input.paymentStatus,
          verified: true,
        },
      });
      const donation = await tx.donation.findFirst({
        where: {provider: "SQUARE", externalReference: input.paymentId},
      });
      let next: DonationStatus | null = null;
      if (donation && target && canTransitionDonation(donation.status, target)) {
        await tx.donation.update({
          where: {id: donation.id},
          data: {
            status: target,
            reconciledAt: target === "COMPLETED" || target === "REFUNDED" ? new Date() : donation.reconciledAt,
          },
        });
        await tx.donationWebhookEvent.update({
          where: {id: event.id},
          data: {donationId: donation.id},
        });
        next = target;
      }
      await tx.donationWebhookEvent.update({
        where: {id: event.id},
        data: {processed: true, processedAt: new Date()},
      });
      await tx.auditLog.create({
        data: {
          action: "DONATION_WEBHOOK_PROCESSED",
          resource: "donation_webhook_event",
          resourceId: event.id,
          metadata: {key: `SQUARE:${input.eventId}`, applied: next},
        },
      });
      return next;
    });
    return {processed: true, applied};
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return {duplicate: true};
  }
}
