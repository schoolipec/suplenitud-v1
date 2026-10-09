import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {Footer} from "@/components/site/Footer";
import {Header} from "@/components/site/Header";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><Header />{children}<Footer /></body>
    </html>
  );
}
