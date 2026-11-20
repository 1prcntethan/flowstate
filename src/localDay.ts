/** Local calendar day as YYYY-MM-DD. Not a UTC date prefix. */
export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftLocalDay(key: string, deltaDays: number): string {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);
  return localDayKey(date);
}

/**
 * Session-id bounds for the local calendar day that contains `now`.
 * Matches the previous dashboard query: local midnight through the next
 * local midnight, expressed as UTC ISO strings so they sort with session ids.
 */
export function todaySessionIdRange(now: Date): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return {
    start: `SESSION#${start.toISOString()}`,
    end: `SESSION#${end.toISOString()}`,
  };
}

/**
 * Consecutive local days that have a scored session.
 * Counts back from today when today is present, otherwise from yesterday,
 * so the streak stays up until the local day ends. A gap older than yesterday is 0.
 * Not persisted. Phase 4 should run the same rule on the server.
 */
export function streakFromLocalDays(days: readonly string[], today: Date): number {
  const present = new Set(days);
  const todayKey = localDayKey(today);
  const yesterdayKey = shiftLocalDay(todayKey, -1);
  let cursor: string | null = present.has(todayKey)
    ? todayKey
    : present.has(yesterdayKey)
      ? yesterdayKey
      : null;
  if (!cursor) return 0;
  let count = 0;
  while (present.has(cursor)) {
    count += 1;
    cursor = shiftLocalDay(cursor, -1);
  }
  return count;
}
