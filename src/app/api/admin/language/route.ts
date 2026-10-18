import {NextRequest, NextResponse} from "next/server";
import {ADMIN_LANGUAGE_COOKIE, adminLocales, isAdminLocale} from "@/i18n/admin-shell";

export async function POST(request: NextRequest) {
  let locale: unknown;
  try {
    ({locale} = await request.json() as {locale?: unknown});
  } catch {
    return new NextResponse(null, {status: 400});
  }
  if (!isAdminLocale(locale)) return new NextResponse(null, {status: 400});
  const response = new NextResponse(null, {status: 204});
  response.cookies.set(ADMIN_LANGUAGE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export function GET() {
  return NextResponse.json({locales: adminLocales});
}
