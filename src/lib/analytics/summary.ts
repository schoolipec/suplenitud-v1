export const OVERVIEW_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OverviewDailyPoint = {date: string; count: number};
export type OverviewEntry = {label: string; count: number};

export type OverviewSummary = {
  pageViews: number;
  uniqueSessions: number;
  topPage: OverviewEntry | null;
  topCountry: OverviewEntry | null;
  geoAvailable: boolean;
  daily: OverviewDailyPoint[];
  window: {from: string; to: string};
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fixed trailing window of the last 30 calendar days (UTC), ending at `now`.
 * Returns the 30 day keys so the caller can render a day without events as 0.
 */
export function overviewWindow(now: Date = new Date()): {from: Date; to: Date; days: string[]} {
  const to = new Date(now);
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(startOfToday.getTime() - (OVERVIEW_WINDOW_DAYS - 1) * DAY_MS);
  const days: string[] = [];
  for (let index = 0; index < OVERVIEW_WINDOW_DAYS; index += 1) {
    days.push(dayKey(new Date(from.getTime() + index * DAY_MS)));
  }
  return {from, to, days};
}

/**
 * Counts events per UTC day. Days without events stay at 0; events outside the
 * provided window are ignored so the series always has exactly `days.length` points.
 */
export function bucketByDay(events: {occurredAt: Date}[], days: string[]): OverviewDailyPoint[] {
  const counts = new Map<string, number>();
  for (const day of days) counts.set(day, 0);
  for (const event of events) {
    const key = dayKey(event.occurredAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((date) => ({date, count: counts.get(date) ?? 0}));
}

/** Highest non-empty entry, or null when there is nothing to show. */
export function topEntry(rows: {label: string | null; count: number}[]): OverviewEntry | null {
  let best: OverviewEntry | null = null;
  for (const row of rows) {
    const label = row.label?.trim();
    if (!label || row.count <= 0) continue;
    if (!best || row.count > best.count) best = {label, count: row.count};
  }
  return best;
}

export function hasAnyViews(daily: OverviewDailyPoint[]): boolean {
  return daily.some((point) => point.count > 0);
}
