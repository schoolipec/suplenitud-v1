import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {hasLocale} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {routing} from "@/i18n/routing";
import {DocumentLocale} from "@/components/site/DocumentLocale";

export const instant = false;

const baseUrl = "https://demo.suplenitud.com";
const metadataCopy = {
  en: {title:"Iglesia Plenitud en Cristo | Las Vegas",description:"Iglesia Plenitud en Cristo: a place to grow, belong, and serve in Las Vegas."},
  es: {title:"Iglesia Plenitud en Cristo | Las Vegas",description:"Iglesia Plenitud en Cristo: un lugar para crecer, pertenecer y servir en Las Vegas."},
  pt: {title:"Igreja Plenitud em Cristo | Las Vegas",description:"Igreja Plenitud em Cristo: um lugar para crescer, pertencer e servir em Las Vegas."},
  ko: {title:"그리스도 안의 플레니투드 교회 | 라스베이거스",description:"그리스도 안의 플레니투드 교회: 성장하고, 속하고, 섬기는 곳입니다."},
  de: {title:"Iglesia Plenitud en Cristo | Las Vegas",description:"Iglesia Plenitud en Cristo: ein Ort zum Wachsen, Dazugehören und Dienen in Las Vegas."}
} as const;

export async function generateMetadata({params}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const copy = metadataCopy[locale as keyof typeof metadataCopy];
  const localePath = locale === "en" ? "/" : `/${locale}/`;
  const languages = Object.fromEntries(routing.locales.map((entry) => [entry, entry === "en" ? `${baseUrl}/` : `${baseUrl}/${entry}/`]));
  return {title: copy.title, description: copy.description, alternates: {canonical: `${baseUrl}${localePath}`, languages}, openGraph: {title: copy.title, description: copy.description, locale, url: `${baseUrl}${localePath}`}};
}

export default async function LocaleLayout({children, params}: LayoutProps<"/[locale]">) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <><DocumentLocale locale={locale}/>{children}</>;
}
