import { describe, expect, it } from "vitest";
import {
  CAPTURE_INTERVAL_MS,
  CHECK_WEIGHT,
  INCOMPLETE_TODO_COIN_PENALTY,
  curveScore,
  elapsedMinutes,
  focusPercent,
  mostlyOnTask,
  overtimeCheck,
  pointsFromScore,
  scoreSession,
} from "../src/scoring";

describe("focus weights and curve", () => {
  it("weights on-task, ambiguous, and off-task", () => {
    expect(CHECK_WEIGHT.on_task).toBe(1);
    expect(CHECK_WEIGHT.ambiguous).toBe(0.5);
    expect(CHECK_WEIGHT.off_task).toBe(0);
  });

  it("returns null for no checks and never treats that as 100%", () => {
    expect(focusPercent([])).toBeNull();
    const scored = scoreSession([], 25);
    expect(scored.noData).toBe(true);
    expect(scored.pointsEarned).toBe(0);
    expect(scored.curvedScore).toBeNull();
    expect(scored.breakPenalty).toBe(0);
  });

  it("scores a full on-task session at 100 before and after the curve", () => {
    expect(focusPercent([{ label: "on_task" }, { label: "on_task" }])).toBe(100);
    expect(curveScore(100)).toBe(100);
  });

  it("scores all off-task as 0", () => {
    const scored = scoreSession([{ label: "off_task" }, { label: "off_task" }], 10);
    expect(scored.noData).toBe(false);
    if (!scored.noData) {
      expect(scored.focusPercent).toBe(0);
      expect(scored.curvedScore).toBe(0);
      expect(scored.pointsEarned).toBe(0);
    }
  });

  it("gives ambiguous checks half weight, including a single overtime check", () => {
    expect(focusPercent([{ label: "ambiguous" }])).toBe(50);
    expect(curveScore(50)).toBe(71);
    const overtime = overtimeCheck();
    expect(overtime.label).toBe("ambiguous");
    expect(CHECK_WEIGHT[overtime.label]).toBe(0.5);
    expect(CAPTURE_INTERVAL_MS).toBe(10_000);
    const fromOvertime = scoreSession([overtime], 0);
    const fromAmbiguous = scoreSession([{ label: "ambiguous" }], 0);
    expect(fromOvertime).toEqual(fromAmbiguous);
  });

  it("mixes weights before the square-root curve", () => {
    expect(focusPercent([{ label: "on_task" }, { label: "off_task" }])).toBe(50);
    expect(
      focusPercent([{ label: "on_task" }, { label: "ambiguous" }]),
    ).toBe(75);
    expect(curveScore(75)).toBe(87);
  });
});

describe("coins", () => {
  it("keeps the existing multipliers for a non-empty session", () => {
    expect(pointsFromScore(100, 10)).toBe(150);
    expect(pointsFromScore(100, 50)).toBe(773);
    expect(pointsFromScore(87, 10)).toBe(87);
  });

  it("does not apply an incomplete-todo penalty", () => {
    expect(INCOMPLETE_TODO_COIN_PENALTY).toBe(0);
    const earned = pointsFromScore(100, 10);
    expect(earned - INCOMPLETE_TODO_COIN_PENALTY * 3).toBe(earned);
  });

  it("reads elapsed from the current timer, not a stale zero", () => {
    expect(elapsedMinutes(25 * 60, 20 * 60)).toBe(5);
    expect(elapsedMinutes(25 * 60, 25 * 60)).toBe(0);
  });
});

describe("live status", () => {
  it("averages every check instead of trusting the latest one", () => {
    expect(mostlyOnTask([])).toBeNull();
    expect(
      mostlyOnTask([
        { label: "on_task" },
        { label: "on_task" },
        { label: "off_task" },
      ]),
    ).toBe(true);
    expect(mostlyOnTask([{ label: "off_task" }])).toBe(false);
    expect(mostlyOnTask([{ label: "ambiguous" }])).toBe(true);
  });
});
