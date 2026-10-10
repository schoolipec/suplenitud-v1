import Home from "../page";
import {type SupportedLocale} from "@/content/locale-copy";

export default async function LocalizedHome({params}: PageProps<"/[locale]">) {
  const {locale} = await params;
  return <Home locale={locale as SupportedLocale} />;
}
