import { describe, expect, it } from "vitest";
import { localDayKey, streakFromLocalDays, todaySessionIdRange } from "../src/localDay";

describe("local day", () => {
  it("uses the local calendar date, not the UTC date prefix", () => {
    const morning = new Date(2026, 9, 27, 0, 30, 0);
    expect(localDayKey(morning)).toBe("2026-10-27");

    const localMidnight = new Date(2026, 9, 27, 0, 0, 0, 0);
    const nextMidnight = new Date(2026, 9, 28, 0, 0, 0, 0);
    expect(todaySessionIdRange(morning)).toEqual({
      start: `SESSION#${localMidnight.toISOString()}`,
      end: `SESSION#${nextMidnight.toISOString()}`,
    });

    const utcMidnight = new Date(Date.UTC(2026, 9, 27, 0, 0, 0, 0));
    if (localMidnight.getTime() !== utcMidnight.getTime()) {
      expect(todaySessionIdRange(morning).start).not.toBe(`SESSION#${utcMidnight.toISOString()}`);
    }
  });
});

describe("streak days", () => {
  const today = new Date(2026, 9, 27, 15, 0, 0);

  it("counts consecutive local days through today", () => {
    expect(streakFromLocalDays(["2026-10-25", "2026-10-26", "2026-10-27"], today)).toBe(3);
    expect(streakFromLocalDays(["2026-10-27"], today)).toBe(1);
  });

  it("keeps yesterday's streak until the local day ends", () => {
    expect(streakFromLocalDays(["2026-10-25", "2026-10-26"], today)).toBe(2);
  });

  it("breaks when the newest day is older than yesterday", () => {
    expect(streakFromLocalDays(["2026-10-25"], today)).toBe(0);
    expect(streakFromLocalDays(["2026-10-24", "2026-10-27"], today)).toBe(1);
  });

  it("does not double-count a repeated day", () => {
    expect(streakFromLocalDays(["2026-10-27", "2026-10-27", "2026-10-26"], today)).toBe(2);
  });
});
