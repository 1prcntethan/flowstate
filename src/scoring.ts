export type CheckLabel = "on_task" | "off_task" | "ambiguous";

export const CHECK_WEIGHT: Record<CheckLabel, number> = {
  on_task: 1,
  ambiguous: 0.5,
  off_task: 0,
};

/** Same interval as regular captures. Overtime checks use this, not a second cadence. */
export const CAPTURE_INTERVAL_MS = 10_000;

export const POINT_SCALE = 10;
export const BASE_RATE = 1;
export const BONUS_MULTIPLIER = 1.3;
export const BONUS_THRESHOLD_MIN = 45;

const RAMP_START = 95;
const RAMP_END = 99;
const RAMP_START_MULT = 1;
const RAMP_END_MULT = 1.3;
const PERFECT_MULT = 1.5;

/**
 * Incomplete-todo coin penalty is an open question.
 * Disabled (0) until the owner sets another value. Do not apply it in the coin formula.
 */
export const INCOMPLETE_TODO_COIN_PENALTY = 0;

export function elapsedMinutes(totalSeconds: number, timeLeftSeconds: number): number {
  return (totalSeconds - timeLeftSeconds) / 60;
}

/** Weighted share of recorded checks, 0–100. Null when nothing was recorded. */
export function focusPercent(checks: readonly { label: CheckLabel }[]): number | null {
  if (checks.length === 0) return null;
  const weighted = checks.reduce((sum, check) => sum + CHECK_WEIGHT[check.label], 0);
  return Math.round((weighted / checks.length) * 100);
}

/** Existing square-root curve. `focus` is the 0–100 weighted share. */
export function curveScore(focus: number): number {
  return Math.round(Math.sqrt(focus / 100) * 100);
}

export function focusMultiplier(curvedScore: number): number {
  if (curvedScore >= 100) return PERFECT_MULT;
  if (curvedScore <= RAMP_START) return RAMP_START_MULT;
  const clamped = Math.min(curvedScore, RAMP_END);
  return (
    RAMP_START_MULT +
    ((clamped - RAMP_START) / (RAMP_END - RAMP_START)) * (RAMP_END_MULT - RAMP_START_MULT)
  );
}

/** Coins from the curved score. Identical to the previous in-component formula. */
export function pointsFromScore(curvedScore: number, elapsed: number): number {
  const basePoints =
    elapsed <= BONUS_THRESHOLD_MIN
      ? elapsed * BASE_RATE
      : BONUS_THRESHOLD_MIN * BASE_RATE +
        (elapsed - BONUS_THRESHOLD_MIN) * BASE_RATE * BONUS_MULTIPLIER;
  return Math.max(
    0,
    Math.round(basePoints * (curvedScore / 100) * focusMultiplier(curvedScore) * POINT_SCALE),
  );
}

export type SessionScore =
  | {
      noData: true;
      focusPercent: null;
      curvedScore: null;
      pointsEarned: 0;
      breakPenalty: 0;
    }
  | {
      noData: false;
      focusPercent: number;
      curvedScore: number;
      pointsEarned: number;
      breakPenalty: 0;
    };

export function scoreSession(
  checks: readonly { label: CheckLabel }[],
  elapsed: number,
): SessionScore {
  const focus = focusPercent(checks);
  if (focus === null) {
    return {
      noData: true,
      focusPercent: null,
      curvedScore: null,
      pointsEarned: 0,
      breakPenalty: 0,
    };
  }
  const curved = curveScore(focus);
  return {
    noData: false,
    focusPercent: focus,
    curvedScore: curved,
    pointsEarned: pointsFromScore(curved, elapsed),
    breakPenalty: 0,
  };
}

/**
 * On-task when the average weight is at least ambiguous (0.5).
 * Null when there are no checks. Uses every recorded check, not only the latest.
 */
export function mostlyOnTask(checks: readonly { label: CheckLabel }[]): boolean | null {
  if (checks.length === 0) return null;
  const weighted = checks.reduce((sum, check) => sum + CHECK_WEIGHT[check.label], 0);
  return weighted / checks.length >= 0.5;
}

export function overtimeCheck(): { label: "ambiguous"; text: string } {
  return { label: "ambiguous", text: "Break overtime" };
}
