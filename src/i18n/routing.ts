import {defineRouting} from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "pt", "ko", "de"],
  defaultLocale: "en",
  localePrefix: "as-needed"
});
