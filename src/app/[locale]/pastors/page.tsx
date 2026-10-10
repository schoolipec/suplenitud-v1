import PastorsPage from "../../pastors/page";
import type {Metadata} from "next";
import {hasLocale} from "next-intl";
import {routing} from "@/i18n/routing";

const baseUrl = "https://demo.suplenitud.com";
export async function generateMetadata({params}: PageProps<"/[locale]/pastors">): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return {title: "Pastors | Iglesia Plenitud en Cristo", description: "Meet the pastoral team of Iglesia Plenitud en Cristo.", alternates: {canonical: `${baseUrl}/${locale}/pastors/`, languages: {en: `${baseUrl}/pastors/`, es: `${baseUrl}/es/pastors/`, pt: `${baseUrl}/pt/pastors/`, ko: `${baseUrl}/ko/pastors/`, de: `${baseUrl}/de/pastors/`}}, openGraph: {url: `${baseUrl}/${locale}/pastors/`, locale}};
}

export default async function LocalizedPastorsPage({params}: PageProps<"/[locale]/pastors">) {
  const {locale} = await params;
  return <PastorsPage />;
}
