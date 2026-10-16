import type {Prisma} from "@/generated/prisma/client";

export type PrayerQueueFilters = {search: string; status: "ALL" | "NEW" | "CLOSED"; dateFrom: string; dateTo: string};
export const DEFAULT_PRAYER_FILTERS: PrayerQueueFilters = {search: "", status: "ALL", dateFrom: "", dateTo: ""};
export const PRAYER_STATUS_LABELS = {NEW: "Nueva", CLOSED: "Presentada"} as const;
export const PRAYER_QUEUE_SELECT = {
  id: true, name: true, message: true, requestType: true, status: true, createdAt: true,
} as const satisfies Prisma.PrayerRequestSelect;
export type PrayerQueueItem = {
  id: string; name: string; message: string; requestType: string; status: string; createdAt: string;
};

export function isCurrentPrayer(request: {requestType: string; status: string}) {
  return request.requestType === "PRAYER_ONLY" && (request.status === "NEW" || request.status === "CLOSED");
}

export function prayerStatusLabel(request: {requestType: string; status: string}) {
  return isCurrentPrayer(request) ? PRAYER_STATUS_LABELS[request.status as "NEW" | "CLOSED"] : "Registro histórico";
}

export function parsePrayerFilters(params: URLSearchParams):
  {ok: true; filters: PrayerQueueFilters} | {ok: false; error: string} {
  const allowed = Object.keys(DEFAULT_PRAYER_FILTERS);
  for (const key of params.keys()) {
    if (!allowed.includes(key) || params.getAll(key).length !== 1) return {ok: false, error: "invalid_filters"};
  }
  const status = params.get("status") ?? "ALL";
  if (status !== "ALL" && status !== "NEW" && status !== "CLOSED") return {ok: false, error: "invalid_status"};
  const search = (params.get("search") ?? "").trim();
  if (search.length > 200 || /[\u0000-\u001f\u007f]/.test(search)) return {ok: false, error: "invalid_search"};
  const dateFrom = params.get("dateFrom") ?? "";
  const dateTo = params.get("dateTo") ?? "";
  for (const date of [dateFrom, dateTo]) {
    if (!date) continue;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      return {ok: false, error: "invalid_date"};
    }
  }
  if (dateFrom && dateTo && dateFrom > dateTo) return {ok: false, error: "invalid_date_range"};
  return {ok: true, filters: {search, status, dateFrom, dateTo}};
}

export function prayerFilterParams(filters: PrayerQueueFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== "ALL") params.set(key, value);
  return params;
}

export function prayerPageParams(params: Record<string, string | string[] | undefined>) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) result.append(key, entry);
  }
  return result;
}

export function prayerQueueWhere(filters: PrayerQueueFilters, output = false): Prisma.PrayerRequestWhereInput {
  const where: Prisma.PrayerRequestWhereInput = {};
  if (output || filters.status !== "ALL") {
    where.requestType = "PRAYER_ONLY";
    where.status = filters.status === "ALL" ? {in: ["NEW", "CLOSED"]} : filters.status;
  }
  if (filters.search) where.OR = [
    {name: {contains: filters.search, mode: "insensitive"}},
    {message: {contains: filters.search, mode: "insensitive"}},
  ];
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? {gte: new Date(`${filters.dateFrom}T00:00:00.000Z`)} : {}),
      ...(filters.dateTo ? {lt: new Date(new Date(`${filters.dateTo}T00:00:00.000Z`).getTime() + 86400000)} : {}),
    };
  }
  return where;
}

export function parsePrayerStatusUpdate(body: unknown): "NEW" | "CLOSED" | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const values = body as Record<string, unknown>;
  if (Object.keys(values).length !== 1) return null;
  return values.status === "NEW" || values.status === "CLOSED" ? values.status : null;
}

export function canUpdatePrayer(request: {requestType: string; status: string}, target: "NEW" | "CLOSED") {
  return isCurrentPrayer(request) && request.status !== target;
}

export function prayerCsvCell(value: string) {
  // Spreadsheet formulas remain literal text, including after leading whitespace.
  const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function prayerQueueCsv(requests: Array<{name: string; message: string; createdAt: Date; requestType: string; status: string}>) {
  return "Fecha,Nombre,Petición,Estado\r\n" + requests.filter(isCurrentPrayer).map((request) =>
    [request.createdAt.toISOString(), request.name, request.message, prayerStatusLabel(request)].map(prayerCsvCell).join(","),
  ).join("\r\n") + "\r\n";
}
