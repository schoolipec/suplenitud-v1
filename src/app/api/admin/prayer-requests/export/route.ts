import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";

export async function GET(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: Record<string, unknown> = {};

  if (filter === "prayer_only") {
    where.requestType = "PRAYER_ONLY";
  } else if (filter === "contact") {
    where.requestType = "PRAYER_AND_CONTACT";
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    }
    if (dateTo) {
      (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }
  }

  const requests = await prisma.prayerRequest.findMany({
    where,
    orderBy: {createdAt: "desc"},
    select: {
      createdAt: true,
      name: true,
      email: true,
      message: true,
      country: true,
      status: true,
      requestType: true,
    },
  });

  const header = "Date,Name,Email,Message,Country,Status,Type\n";
  const rows = requests.map((r) => {
    const date = r.createdAt.toISOString();
    const name = `"${r.name.replace(/"/g, '""')}"`;
    const email = r.email ? `"${r.email.replace(/"/g, '""')}"` : "";
    const message = `"${r.message.replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const country = r.country || "";
    const status = r.status;
    const type = r.requestType;
    return `${date},${name},${email},${message},${country},${status},${type}`;
  }).join("\n");

  const csv = header + rows + "\n";

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "PRAYER_REQUEST_EXPORTED",
      resource: "prayer_request",
      metadata: {filter, count: requests.length},
    },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prayer-requests-${filter}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
