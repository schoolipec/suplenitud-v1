import type { Metadata } from "next";
import {headers} from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import {Footer} from "@/components/site/Footer";
import {Header} from "@/components/site/Header";
import {PageViewTracker} from "@/components/analytics/PageViewTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {title: "Iglesia Plenitud en Cristo", description: "Iglesia Plenitud en Cristo - Las Vegas, Nevada."};
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get("x-next-intl-locale");
  const locale = requestedLocale === "es" || requestedLocale === "pt" || requestedLocale === "ko" || requestedLocale === "de" ? requestedLocale : "en";
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><Header /><PageViewTracker />{children}<Footer /></body>
    </html>
  );
}
