import {NextRequest, NextResponse} from "next/server";
import {supportedLocales} from "@/content/locale-copy";

export async function POST(request: NextRequest) {
  let locale: unknown;
  try { ({locale} = await request.json() as {locale?: unknown}); } catch { return new NextResponse(null, {status: 400}); }
  if (typeof locale !== "string" || !supportedLocales.includes(locale as (typeof supportedLocales)[number])) return new NextResponse(null, {status: 400});
  const response = new NextResponse(null, {status: 204});
  response.cookies.set("ipec-language", locale, {path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production"});
  return response;
}
