import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {loadContentAdmin} from "@/lib/content-loader";

export async function GET(request: Request) {
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const blocks = await loadContentAdmin();
  return NextResponse.json({blocks});
}
