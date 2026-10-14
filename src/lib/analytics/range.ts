export type DateRange = {from: Date; to: Date};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the ?from=&to= report window. Defaults to the last 30 days
 * (inclusive). Invalid values fall back to defaults; an inverted range is
 * swapped so the report never queries backwards.
 */
export function resolveDateRange(
  input: {from?: unknown; to?: unknown},
  now: Date = new Date(),
): DateRange & {fromInput: string; toInput: string} {
  const fallbackTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const fallbackFrom = new Date(fallbackTo.getTime() - 29 * DAY_MS);
  fallbackFrom.setUTCHours(0, 0, 0, 0);
  let from = parseDay(input.from) ?? new Date(fallbackFrom);
  let to = parseDay(input.to) ?? new Date(fallbackTo);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);
  if (from.getTime() > to.getTime()) {
    const swap = from;
    from = new Date(to);
    from.setUTCHours(0, 0, 0, 0);
    to = new Date(swap);
    to.setUTCHours(23, 59, 59, 999);
  }
  return {from, to, fromInput: toInputValue(from), toInput: toInputValue(to)};
}
