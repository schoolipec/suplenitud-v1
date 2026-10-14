import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewDonations} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {DonationsConsole} from "@/components/admin/DonationsConsole";
import {getPaymentsStatus} from "@/lib/payments/config";

export const instant = false;
export const metadata = {title: "Donations | Iglesia Plenitud en Cristo"};

const STATUSES = ["PENDING", "APPROVED", "COMPLETED", "FAILED", "CANCELLED", "CONFIRMED", "REFUNDED"] as const;
const PROVIDERS = ["PAYPAL", "SQUARE"] as const;

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string; provider?: string; detail?: string}>;
}) {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canViewDonations(roles)) redirect("/admin/sign-in?error=unauthorized");
  const diagnosticsVisible = roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");

  const params = await searchParams;
  const statusFilter = (STATUSES as readonly string[]).includes(params.status ?? "") ? params.status! : "ALL";
  const providerFilter = (PROVIDERS as readonly string[]).includes(params.provider ?? "") ? params.provider! : "ALL";
  const where = {
    ...(statusFilter === "ALL" ? {} : {status: statusFilter as (typeof STATUSES)[number]}),
    ...(providerFilter === "ALL" ? {} : {provider: providerFilter}),
  };

  const [rows, byStatus, byProvider, detail] = await Promise.all([
    prisma.donation.findMany({where, orderBy: {createdAt: "desc"}, take: 100}),
    prisma.donation.groupBy({by: ["status"], _count: {_all: true}}),
    prisma.donation.groupBy({by: ["provider"], _count: {_all: true}}),
    typeof params.detail === "string" && params.detail.length > 0
      ? prisma.donation.findUnique({
          where: {id: params.detail},
          include: {webhookEvents: {orderBy: {receivedAt: "desc"}}},
        })
      : null,
  ]);
  const payments = getPaymentsStatus();

  return (
    <AdminFrame roles={roles} title="Donations">
      <DonationsConsole
        rows={rows.map((item) => ({
          ...item,
          amount: item.amount.toString(),
          fund: item.fund,
          reconciledAt: item.reconciledAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
        }))}
        byStatus={byStatus.map((row) => ({status: row.status, count: row._count._all}))}
        byProvider={byProvider.map((row) => ({provider: row.provider, count: row._count._all}))}
        detail={
          detail
            ? {
                ...detail,
                amount: detail.amount.toString(),
                fund: detail.fund,
                reconciledAt: detail.reconciledAt?.toISOString() ?? null,
                createdAt: detail.createdAt.toISOString(),
                webhookEvents: detail.webhookEvents.map((event) => ({
                  ...event,
                  receivedAt: event.receivedAt.toISOString(),
                })),
              }
            : null
        }
        payments={payments}
        statusFilter={statusFilter}
        providerFilter={providerFilter}
        diagnosticsVisible={diagnosticsVisible}
      />
    </AdminFrame>
  );
}
