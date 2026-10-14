import {existsSync} from "node:fs";
import maxmind, {type CityResponse} from "maxmind";

export type GeoLocation = {countryCode?: string; countryName?: string; regionCode?: string; regionName?: string};

type CityReader = {get(ip: string): CityResponse | null};

let cachedReader: Promise<CityReader | null> | undefined;

function databasePath(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env.GEOIP_DATABASE_PATH ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * True when a local GeoLite2-City database file is configured and present.
 * Used by /admin/visits to state explicitly when geography is unavailable.
 */
export function isGeoAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  const path = databasePath(env);
  if (!path) return false;
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

async function getReader(): Promise<CityReader | null> {
  if (cachedReader !== undefined) return cachedReader;
  const path = databasePath();
  if (!path) {
    cachedReader = Promise.resolve(null);
    return cachedReader;
  }
  cachedReader = maxmind
    .open<CityResponse>(path)
    .then((reader) => reader as unknown as CityReader)
    .catch(() => {
      cachedReader = undefined;
      return null;
    });
  return cachedReader;
}

function pickName(names: unknown): string | undefined {
  if (!names || typeof names !== "object") return undefined;
  const record = names as Record<string, unknown>;
  if (typeof record.en === "string" && record.en.length > 0) return record.en;
  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Resolve coarse geography for an in-memory IP. Country is returned for every
 * lookup; region/state only when the country is US. City, postal and any
 * precise location are never returned and therefore can never be persisted.
 * Without a configured database this returns {} and analytics keeps working.
 */
export async function resolveGeoIp(ip: string | null): Promise<GeoLocation> {
  if (!ip) return {};
  const reader = await getReader();
  if (!reader) return {};
  let response: CityResponse | null = null;
  try {
    response = reader.get(ip);
  } catch {
    return {};
  }
  if (!response?.country?.iso_code) return {};
  const countryCode = response.country.iso_code.toUpperCase();
  const geo: GeoLocation = {
    countryCode,
    countryName: pickName(response.country.names),
  };
  if (countryCode === "US") {
    const subdivision = response.subdivisions?.[0];
    if (subdivision?.iso_code) geo.regionCode = subdivision.iso_code.toUpperCase().slice(0, 10);
    const regionName = pickName(subdivision?.names);
    if (regionName) geo.regionName = regionName;
  }
  return geo;
}
