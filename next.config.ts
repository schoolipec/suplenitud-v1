import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {source: "/index.html", destination: "/", permanent: true},
      {source: "/pastors/index.html", destination: "/pastors/", permanent: true}
    ];
  }
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
