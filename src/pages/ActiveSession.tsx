import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Page, SessionResult } from "../App";
import type { SessionConfig } from "../types";
import styles from "./ActiveSession.module.css";
import BreakScreen from "./BreakScreen";
import EndConfirmModal from "../components/EndConfirmModal";
import MiniSession from "../components/MiniSession";
import {
  CAPTURE_INTERVAL_MS,
  elapsedMinutes as elapsedMinutesFromTimer,
  mostlyOnTask,
  overtimeCheck,
  scoreSession,
  type CheckLabel,
} from "../scoring";
import { isTodoDone, todoTextForClassifier, toggleTodo, withOrder } from "../todos";

type CaptureLabel = CheckLabel;

type CaptureEntry = {
  id: string;
  label: CaptureLabel;
  text: string;
};

type Props = {
  nav: (p: Page) => void;
  config: SessionConfig;
  onEnd: (result: SessionResult) => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getGrade(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function getGradeColor(grade: string): string {
  if (grade === "S" || grade === "A") return "var(--status-green)";
  if (grade === "B" || grade === "C") return "var(--status-amber)";
  return "var(--status-red)";
}

export default function ActiveSession({ config, onEnd }: Props) {
  const [timeLeft, setTimeLeft] = useState(config.durationMinutes * 60);
  const [todos, setTodos] = useState(config.todos);
  const [trackingPaused, setTrackingPaused] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeLeftAtLastBreakEnd = useRef(config.durationMinutes * 60);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [captures, setCaptures] = useState<CaptureEntry[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const pauseStartedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const timeLeftRef = useRef(timeLeft);
  const todosRef = useRef(todos);
  timeLeftRef.current = timeLeft;
  todosRef.current = todos;

  const PAUSE_GRACE_MS = 120_000; // how long a pause gets benefit-of-the-doubt

  const breakConfig = useMemo(() => {
    const d = config.durationMinutes;
    if (d <= 30) return null; // no break for short sessions
    if (config.breakMode === "pomodoro") {
      return d >= 90
        ? { intervalSecs: 50 * 60, breakSecs: 10 * 60 }
        : { intervalSecs: 25 * 60, breakSecs: 5 * 60 };
    }
    return d > 60
      ? { intervalSecs: 45 * 60, breakSecs: 10 * 60 }
      : { intervalSecs: 25 * 60, breakSecs: 5 * 60 };
  }, [config.durationMinutes, config.breakMode]);

  const totalSeconds = config.durationMinutes * 60;
  const studySinceLastBreak = timeLeftAtLastBreakEnd.current - timeLeft;
  const breakOvertime =
    onBreak && !!breakConfig && breakElapsed > breakConfig.breakSecs;
  const breakAvailable =
    !!breakConfig &&
    !onBreak &&
    studySinceLastBreak >= (breakConfig?.intervalSecs ?? Infinity);
  const secsUntilBreak = breakConfig
    ? Math.max(0, breakConfig.intervalSecs - studySinceLastBreak)
    : 0;

  const breakBtnDisabled =
    !breakAvailable || !breakConfig || config.breakMode === "pomodoro";

  useEffect(() => {
    if (!config.trackingEnabled || onBreak) return;

    const loop = setInterval(async () => {
      if (trackingPaused) {
        const pausedFor = pauseStartedAtRef.current
          ? Date.now() - pauseStartedAtRef.current
          : 0;
        const cumulativePaused = totalPausedMsRef.current + pausedFor;
        const escalated = cumulativePaused > PAUSE_GRACE_MS; // one-time budget for the whole session
        console.log("tracking paused");
        setCaptures((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            label: escalated ? "off_task" : "ambiguous",
            text: escalated ? "Tracking paused (extended)" : "Tracking paused",
          },
        ]);
        return;
      }

      const idleSecs = await window.electronAPI.getIdleTime();
      if (idleSecs > 120) {
        console.log("idle > 120 sec");
        setCaptures((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            label: "off_task",
            text: `Idle ${idleSecs}s`,
          },
        ]);
        return;
      }

      const ready = await window.electronAPI.isAiReady();
      setUsingFallback(!ready);
      // Latest timer value on this tick. Coins use the same helper during render.
      const elapsedNow = elapsedMinutesFromTimer(
        totalSeconds,
        timeLeftRef.current,
      );
      if (Number.isNaN(elapsedNow)) return;

      const result = await window.electronAPI.classify({
        subjects: [config.subject],
        todos: todosRef.current
          .map((t) => ({ text: todoTextForClassifier(t.text) }))
          .filter((t) => t.text.length > 0),
      });
      console.log("classify function run");
      setCaptures((prev) => [
        ...prev,
        { id: Date.now().toString(), label: result.label, text: result.reason },
      ]);
    }, CAPTURE_INTERVAL_MS);

    return () => clearInterval(loop);
  }, [trackingPaused, onBreak]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      window.electronAPI.isAiReady().then((ready) => {
        if (!cancelled) setUsingFallback(!ready);
      });
    };
    check();
    const id = setInterval(check, CAPTURE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (trackingPaused) {
      pauseStartedAtRef.current = Date.now();
    } else if (pauseStartedAtRef.current) {
      totalPausedMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
  }, [trackingPaused]);

  useEffect(() => {
    if (onBreak && !breakOvertime) return;
    if (timeLeft <= 0) {
      handleEnd();
      return;
    }
    const tick = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(tick);
  }, [timeLeft, onBreak, breakOvertime]);

  useEffect(() => {
    //break elapsed counts up
    if (!onBreak) return;
    const tick = setInterval(() => setBreakElapsed((t) => t + 1), 1000);
    return () => clearInterval(tick);
  }, [onBreak]);

  useEffect(() => {
    //pomodoro auto-break logic
    if (
      config.breakMode !== "pomodoro" ||
      !breakConfig ||
      onBreak ||
      timeLeft <= 0
    )
      return;
    if (studySinceLastBreak >= breakConfig.intervalSecs) {
      startBreak();
    }
  }, [timeLeft]);

  useEffect(() => {
    // allotted break records nothing; overtime counts as ambiguous at the capture cadence
    if (!breakOvertime) return;
    const tick = setInterval(() => {
      const check = overtimeCheck();
      setCaptures((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          label: check.label,
          text: check.text,
        },
      ]);
    }, CAPTURE_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [breakOvertime]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const top = scrollRef.current.scrollTop;
    setScrolled((prev) => (prev ? top > 0 : top > 1));
  };

  const elapsedMinutes = elapsedMinutesFromTimer(totalSeconds, timeLeft);
  const scored = scoreSession(captures, elapsedMinutes);
  const curvedScore = scored.noData ? 0 : scored.curvedScore;
  const pointsEarned = scored.pointsEarned;
  const grade = scored.noData ? "" : getGrade(scored.curvedScore);
  const onTaskCount = captures.filter((c) => c.label === "on_task").length;
  const taskStatus = mostlyOnTask(captures);
  const statusLabel =
    taskStatus === null ? "No checks yet" : taskStatus ? "On task" : "Off task";
  const statusClass =
    taskStatus === null ? "" : taskStatus ? styles.statusOn : styles.statusOff;

  const toggleTodoDone = (id: string) => {
    setTodos((prev) => toggleTodo(prev, id, new Date().toISOString()));
  };

  const startBreak = useCallback(() => {
    window.electronAPI?.setExpandMode?.().catch?.(() => undefined);
    setIsMiniMode(false);
    setOnBreak(true);
    setBreakElapsed(0);
  }, []);

  const endBreak = useCallback(() => {
    timeLeftAtLastBreakEnd.current = timeLeft;
    setOnBreak(false);
    setBreakElapsed(0);
  }, [timeLeft]);

  const handleExpand = async () => {
    try {
      await window.electronAPI?.setExpandMode();
    } catch {
      // window may already be expanded
    }
    setIsMiniMode(false);
  };

  const handleEnd = async () => {
    await handleExpand();
    const ordered = withOrder(todos);
    onEnd({
      subject: config.subject,
      durationMinutes: Math.round(elapsedMinutes),
      noData: scored.noData,
      focusScore: scored.noData ? null : scored.curvedScore,
      pointsEarned,
      breakPenalty: scored.breakPenalty,
      onTaskCount,
      totalCaptures: captures.length,
      breakMinutes: 0,
      todos: ordered,
      todosTotal: ordered.length,
      todosCompleted: ordered.filter((t) => isTodoDone(t)).length,
    });
  };

  const handleMiniMode = async () => {
    try {
      await window.electronAPI?.setMiniMode();
      console.log("mini mode");
    } catch {
      // stay in the current window size
    }
    setIsMiniMode(true);
  };

  if (isMiniMode) {
    return (
      <>
        <MiniSession
          timeLeft={timeLeft}
          pointsEarned={pointsEarned}
          isOnTask={taskStatus}
          trackingPaused={trackingPaused}
          onExpand={handleExpand}
          onBreak={startBreak}
          breakDisabled={breakBtnDisabled}
          onEnd={async () => {
            await handleExpand();
            setShowEndConfirm(true);
          }}
        />
        {showEndConfirm && (
          <EndConfirmModal
            pointsEarned={pointsEarned}
            onConfirm={handleEnd}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}
      </>
    );
  }

  if (onBreak) {
    return (
      <>
        <BreakScreen
          breakElapsed={breakElapsed}
          breakLimitSecs={breakConfig?.breakSecs ?? 300}
          isOvertime={breakOvertime}
          focusScore={scored.noData ? null : curvedScore}
          pointsEarned={pointsEarned}
          completedTodos={todos.filter((t) => isTodoDone(t)).length}
          totalTodos={todos.length}
          onResume={endBreak}
          onEnd={() => setShowEndConfirm(true)} // ← was handleEnd(), now shows confirm
        />
        {showEndConfirm && (
          <EndConfirmModal
            pointsEarned={pointsEarned}
            onConfirm={handleEnd}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}
      </>
    );
  }

  // ── Break button label for manual mode ──
  const breakBtnLabel = !breakConfig
    ? "No break this session"
    : config.breakMode === "pomodoro"
      ? `Auto-break in ${Math.ceil(secsUntilBreak / 60)}m`
      : breakAvailable
        ? "Take a break"
        : `Break in ${Math.ceil(secsUntilBreak / 60)}m`;

  return (
    <div className="page">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/logo512.svg" className={styles.pageLogo} />
          {/* Badge slides in when collapsed */}
          <div
            className={`${styles.headerBadge} ${scrolled ? styles.headerBadgeVisible : ""} ${statusClass}`}
          >
            <span className={styles.statusDot} />
            {statusLabel}
          </div>
        </div>
        <div className={styles.headerButtons}>
          <button
            className={`${styles.headerBtn} ${trackingPaused ? styles.headerBtnActive : ""}`}
            onClick={() => setTrackingPaused((p) => !p)}
          >
            {trackingPaused ? "Resume tracking" : "Pause tracking"}
          </button>
          <button className={styles.headerBtn} onClick={handleMiniMode}>
            Mini mode
          </button>
        </div>
      </div>

      {/* Timer block — collapses + sticks on scroll */}
      <div
        className={`${styles.timerBlock} ${scrolled ? styles.timerBlockCollapsed : ""}`}
      >
        {/* Row: timer + (inline bar when collapsed) */}
        <div
          className={`${styles.timerRow} ${scrolled ? styles.timerRowCollapsed : ""}`}
        >
          <span
            className={`${styles.timerDisplay} ${scrolled ? styles.timerDisplayCollapsed : ""}`}
          >
            {formatTime(timeLeft)}
          </span>
          {/* Inline bar — only visible when collapsed */}
          <div
            className={`${styles.inlineBar} ${scrolled ? styles.inlineBarVisible : ""}`}
          >
            <div className={styles.inlineBarTrack}>
              <div
                className={styles.focusBarFill}
                style={{
                  background: grade ? getGradeColor(grade) : "var(--orange-cream-20)",
                  width: `${scored.noData ? 0 : curvedScore}%`,
                }}
              />
            </div>
          </div>
          <span
            className={`${styles.inlineGrade} ${scrolled ? styles.inlineGradeVisible : ""}`}
            style={{ color: grade ? getGradeColor(grade) : "var(--orange-cream-20)" }}
          >
            {scored.noData ? "No checks yet" : `On track for ${grade}`}
          </span>
        </div>

        {/* These collapse away */}
        <span
          className={`${styles.timerLabel} ${scrolled ? styles.colHide : ""}`}
        >
          {onBreak ? "on break" : "remaining"}
        </span>
        <div
          className={`${styles.statusBadge} ${scrolled ? styles.colHide : ""} ${statusClass}`}
        >
          <span className={styles.statusDot} />
          {statusLabel}
        </div>

        {/* Subtitle — always visible, position shifts */}
        <span
          className={`${styles.sessionSubtitle} ${scrolled ? styles.sessionSubtitleCollapsed : ""}`}
        >
          Studying {config.subject || "—"} ·{" "}
          <span className={styles.pointsEarned}>+{pointsEarned} points</span>
          {usingFallback ? " · Keyword fallback while the model warms up" : ""}
        </span>

        {/* Full focus bar — collapses away */}
        <div
          className={`${styles.focusBarSection} ${scrolled ? styles.colHide : ""}`}
        >
          <div className={styles.focusBarMeta}>
            <span className={styles.focusLabel}>Focus score</span>
            <span
              className={styles.gradeLabel}
              style={{ color: grade ? getGradeColor(grade) : "var(--orange-cream-20)" }}
            >
              {scored.noData
                ? "No checks yet"
                : curvedScore >= 85
                  ? `On track for ${grade}`
                  : `Grade: ${grade}`}
            </span>
          </div>
          <div className={styles.focusBarTrack}>
            <div
              className={styles.focusBarFill}
              style={{
                background: grade ? getGradeColor(grade) : "var(--orange-cream-20)",
                width: `${scored.noData ? 0 : curvedScore}%`,
              }}
            />
          </div>
          <div className={styles.focusBarTicks}>
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`${styles.scrollContent} ${scrolled ? styles.scrollContentCollapsed : ""}`}
      >
        {/* ── Tasks + Captures ── */}
        <div className={styles.columns}>
          <div className={styles.column}>
            <span className={styles.columnTitle}>TASKS</span>
            {todos.map((t) => (
              <button
                key={t.id}
                className={`${styles.taskItem} ${isTodoDone(t) ? styles.taskDone : ""}`}
                onClick={() => toggleTodoDone(t.id)}
              >
                <span
                  className={`${styles.taskCircle} ${isTodoDone(t) ? styles.taskCircleDone : ""}`}
                />
                <span className={styles.taskText}>{t.text}</span>
              </button>
            ))}
          </div>

          <div className={styles.column}>
            <span className={styles.columnTitle}>CAPTURES</span>
            {[...captures].reverse().map((c) => (
              <div
                key={c.id}
                className={`${styles.captureItem} ${
                  c.label === "off_task"
                    ? styles.captureOff
                    : c.label === "ambiguous"
                      ? styles.captureAmbiguous
                      : styles.captureOn
                }`}
              >
                <span
                  className={`${styles.captureDot} ${c.label === "off_task" ? styles.captureDotOff : styles.captureDotOn}`}
                />
                <span className={styles.captureText}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom padding so last items aren't hidden behind bottomBar */}
        <div style={{ height: 20 }} />
      </div>

      {/* ── Fade gradient above bottom bar ── */}
      <div className={styles.fadeGradient} />

      {/* ── Back to top ── */}
      {scrolled && (
        <button
          className={styles.backToTop}
          onClick={() =>
            scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
          }
        >
          ↑
        </button>
      )}

      {/* ── Bottom actions ── */}
      <div className={styles.bottomBar}>
        <button
          className={`${styles.breakBtn} ${breakBtnDisabled ? styles.breakBtnDisabled : ""}`}
          onClick={() => !breakBtnDisabled && startBreak()}
          disabled={breakBtnDisabled}
        >
          {breakBtnLabel}
        </button>
        <button
          className={styles.endBtn}
          onClick={() => setShowEndConfirm(true)}
        >
          End
        </button>
      </div>
      {showEndConfirm && (
        <EndConfirmModal
          pointsEarned={pointsEarned}
          onConfirm={handleEnd}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  );
}
