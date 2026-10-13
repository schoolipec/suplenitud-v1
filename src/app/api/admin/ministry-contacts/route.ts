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

  const contacts = await prisma.ministryContact.findMany({
    where: {active: true, authorized: true},
    select: {
      id: true,
      name: true,
      ministry: true,
      locale: true,
      phone: true,
      whatsapp: true,
    },
    orderBy: {name: "asc"},
  });

  return NextResponse.json({contacts});
}
