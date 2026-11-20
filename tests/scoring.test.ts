import { describe, expect, it } from "vitest";
import {
  CAPTURE_INTERVAL_MS,
  CHECK_WEIGHT,
  INCOMPLETE_TODO_COIN_PENALTY,
  SESSION_CLOCK_PAUSES_ON_BREAK,
  advanceSessionClock,
  captureGate,
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

describe("break clock", () => {
  const captureSeconds = CAPTURE_INTERVAL_MS / 1000;

  it("does not pause the session clock for a break", () => {
    expect(SESSION_CLOCK_PAUSES_ON_BREAK).toBe(false);
    expect(captureGate(false, 0, 300)).toBe("study");
    expect(captureGate(true, 300, 300)).toBe("allotted-break");
    expect(captureGate(true, 301, 300)).toBe("overtime");
    expect(captureGate(true, 999, null)).toBe("allotted-break");
  });

  it("keeps the session clock running through allotted break and records nothing", () => {
    const studied = [{ label: "on_task" as const }, { label: "off_task" as const }];
    const stepped = advanceSessionClock(
      {
        timeLeftSeconds: 50,
        onBreak: true,
        breakElapsedSeconds: 0,
        breakLimitSeconds: 300,
        checks: studied,
      },
      10,
    );
    expect(stepped.timeLeftSeconds).toBe(40);
    expect(stepped.breakElapsedSeconds).toBe(10);
    expect(stepped.ended).toBe(false);
    expect(stepped.checks).toEqual(studied);
    expect(stepped.breakPenalty).toBe(0);
    expect(scoreSession(stepped.checks, 10)).toEqual(scoreSession(studied, 10));
  });

  it("ends the session when the clock hits zero during an allotted break", () => {
    const total = 25 * 60;
    const studied = [{ label: "on_task" as const }, { label: "on_task" as const }];
    const stepped = advanceSessionClock(
      {
        timeLeftSeconds: total,
        onBreak: true,
        breakElapsedSeconds: 0,
        breakLimitSeconds: 30 * 60,
        checks: studied,
      },
      total + 10,
    );
    expect(stepped.ended).toBe(true);
    expect(stepped.timeLeftSeconds).toBe(0);
    expect(stepped.breakElapsedSeconds).toBe(total);
    expect(stepped.checks).toEqual(studied);
    expect(stepped.breakPenalty).toBe(0);
    const scored = scoreSession(stepped.checks, elapsedMinutes(total, stepped.timeLeftSeconds));
    expect(scored.noData).toBe(false);
    if (!scored.noData) {
      expect(scored.curvedScore).toBe(100);
      expect(scored.breakPenalty).toBe(0);
      expect(scored.pointsEarned).toBe(pointsFromScore(100, 25));
    }
  });

  it("inserts ambiguous checks on the capture interval once a break is overtime", () => {
    const limit = 5;
    const before = advanceSessionClock(
      {
        timeLeftSeconds: 600,
        onBreak: true,
        breakElapsedSeconds: 0,
        breakLimitSeconds: limit,
      },
      limit + captureSeconds,
    );
    expect(before.checks).toEqual([]);

    const first = advanceSessionClock(
      {
        timeLeftSeconds: 600,
        onBreak: true,
        breakElapsedSeconds: 0,
        breakLimitSeconds: limit,
      },
      limit + captureSeconds + 1,
    );
    expect(first.checks.map((check) => check.label)).toEqual(["ambiguous"]);
    expect(first.breakPenalty).toBe(0);

    const second = advanceSessionClock(
      {
        timeLeftSeconds: 600,
        onBreak: true,
        breakElapsedSeconds: 0,
        breakLimitSeconds: limit,
      },
      limit + captureSeconds * 2 + 1,
    );
    expect(second.checks.map((check) => check.label)).toEqual(["ambiguous", "ambiguous"]);
  });

  it("lets overtime checks drag the score down without a break coin penalty", () => {
    const studied = [{ label: "on_task" as const }, { label: "on_task" as const }];
    const stepped = advanceSessionClock(
      {
        timeLeftSeconds: 600,
        onBreak: true,
        breakElapsedSeconds: 6,
        breakLimitSeconds: 5,
        checks: studied,
      },
      captureSeconds * 2,
    );
    expect(stepped.checks.filter((check) => check.label === "ambiguous")).toHaveLength(2);
    const clean = scoreSession(studied, 10);
    const dragged = scoreSession(stepped.checks, 10);
    expect(clean.noData).toBe(false);
    expect(dragged.noData).toBe(false);
    if (!clean.noData && !dragged.noData) {
      expect(dragged.focusPercent).toBe(75);
      expect(dragged.curvedScore).toBeLessThan(clean.curvedScore);
      expect(dragged.breakPenalty).toBe(0);
      expect(dragged.pointsEarned).toBeGreaterThan(0);
    }
  });

  it("drops a partial overtime interval when the session expires mid-break", () => {
    const studied = [{ label: "on_task" as const }];
    const stepped = advanceSessionClock(
      {
        timeLeftSeconds: 12,
        onBreak: true,
        breakElapsedSeconds: 6,
        breakLimitSeconds: 5,
        checks: studied,
      },
      30,
    );
    expect(stepped.ended).toBe(true);
    expect(stepped.timeLeftSeconds).toBe(0);
    expect(stepped.checks.filter((check) => check.label === "ambiguous")).toHaveLength(1);
    expect(stepped.breakPenalty).toBe(0);
    const scored = scoreSession(stepped.checks, 12 / 60);
    expect(scored.breakPenalty).toBe(0);
    expect(scored.noData).toBe(false);
  });

  it("does not insert break checks or advance break time while studying", () => {
    const stepped = advanceSessionClock(
      {
        timeLeftSeconds: 30,
        onBreak: false,
        breakElapsedSeconds: 4,
        breakLimitSeconds: 5,
      },
      10,
    );
    expect(stepped.timeLeftSeconds).toBe(20);
    expect(stepped.breakElapsedSeconds).toBe(4);
    expect(stepped.checks).toEqual([]);
    expect(stepped.ended).toBe(false);
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
