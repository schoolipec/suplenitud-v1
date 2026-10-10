import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {hasLocale} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {routing} from "@/i18n/routing";

export const instant = false;

const baseUrl = "https://demo.suplenitud.com";

export async function generateMetadata({params}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const localePath = locale === "en" ? "/" : `/${locale}/`;
  const languages = Object.fromEntries(routing.locales.map((entry) => [entry, entry === "en" ? `${baseUrl}/` : `${baseUrl}/${entry}/`]));
  return {alternates: {canonical: `${baseUrl}${localePath}`, languages}, openGraph: {locale, url: `${baseUrl}${localePath}`}};
}

export default async function LocaleLayout({children, params}: LayoutProps<"/[locale]">) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return children;
}
