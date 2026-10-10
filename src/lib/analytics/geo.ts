export type GeoLocation = {countryCode?: string; countryName?: string; regionCode?: string; regionName?: string; city?: string};

/** Server-side boundary for a future GeoIP provider; visitor IPs are never persisted. */
export function resolveGeo(headers: Headers): GeoLocation {
  if (process.env.GEO_TRUST_PROXY_HEADERS !== "true") return {};
  return {
    countryCode: headers.get("x-geo-country-code")?.slice(0, 2).toUpperCase(),
    countryName: headers.get("x-geo-country-name")?.slice(0, 100),
    regionCode: headers.get("x-geo-region-code")?.slice(0, 2).toUpperCase(),
    regionName: headers.get("x-geo-region-name")?.slice(0, 100),
    city: headers.get("x-geo-city")?.slice(0, 100)
  };
}
