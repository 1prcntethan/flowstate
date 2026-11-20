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

/**
 * The session clock runs during a break, allotted or overtime, and the
 * session ends at zero either way. Tests and ActiveSession both read this.
 */
export const SESSION_CLOCK_PAUSES_ON_BREAK = false;

export type CaptureGate = "study" | "allotted-break" | "overtime";

/**
 * Study records screen checks. Allotted break records nothing.
 * Overtime is strict: the second the limit is reached is still allotted.
 * A break with no limit never becomes overtime.
 */
export function captureGate(
  onBreak: boolean,
  breakElapsedSeconds: number,
  breakLimitSeconds: number | null,
): CaptureGate {
  if (!onBreak) return "study";
  if (breakLimitSeconds !== null && breakElapsedSeconds > breakLimitSeconds) {
    return "overtime";
  }
  return "allotted-break";
}

export type SessionClock = {
  timeLeftSeconds: number;
  onBreak: boolean;
  breakElapsedSeconds: number;
  breakLimitSeconds: number | null;
  checks?: readonly { label: CheckLabel }[];
};

export type SessionClockResult = {
  timeLeftSeconds: number;
  breakElapsedSeconds: number;
  ended: boolean;
  checks: { label: CheckLabel; text?: string }[];
  breakPenalty: 0;
};

/**
 * Advance the session by whole seconds.
 * The clock moves while `SESSION_CLOCK_PAUSES_ON_BREAK` is false.
 * Allotted break appends no checks. Continuous overtime appends one
 * ambiguous check per full capture interval, starting a full interval
 * after overtime begins. Ending the session drops a partial interval.
 */
export function advanceSessionClock(start: SessionClock, seconds: number): SessionClockResult {
  let timeLeft = start.timeLeftSeconds;
  let breakElapsed = start.breakElapsedSeconds;
  const checks: { label: CheckLabel; text?: string }[] = [...(start.checks ?? [])];
  if (timeLeft <= 0 || seconds <= 0) {
    return {
      timeLeftSeconds: timeLeft,
      breakElapsedSeconds: breakElapsed,
      ended: timeLeft <= 0,
      checks,
      breakPenalty: 0,
    };
  }

  let inOvertime =
    captureGate(start.onBreak, breakElapsed, start.breakLimitSeconds) === "overtime";
  let msUntilOvertimeCheck = CAPTURE_INTERVAL_MS;
  let ended = false;

  for (let step = 0; step < seconds && !ended; step += 1) {
    if (!(SESSION_CLOCK_PAUSES_ON_BREAK && start.onBreak)) {
      timeLeft -= 1;
    }
    if (start.onBreak) breakElapsed += 1;

    const nowOvertime =
      captureGate(start.onBreak, breakElapsed, start.breakLimitSeconds) === "overtime";
    if (nowOvertime) {
      if (!inOvertime) {
        inOvertime = true;
        msUntilOvertimeCheck = CAPTURE_INTERVAL_MS;
      } else {
        msUntilOvertimeCheck -= 1000;
        if (msUntilOvertimeCheck <= 0) {
          checks.push(overtimeCheck());
          msUntilOvertimeCheck += CAPTURE_INTERVAL_MS;
        }
      }
    } else {
      inOvertime = false;
    }

    if (timeLeft <= 0) ended = true;
  }

  return {
    timeLeftSeconds: timeLeft,
    breakElapsedSeconds: breakElapsed,
    ended,
    checks,
    breakPenalty: 0,
  };
}
