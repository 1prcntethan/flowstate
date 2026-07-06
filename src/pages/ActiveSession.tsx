import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Page, SessionResult } from "../App";
import type { SessionConfig } from "../types";
import styles from "./ActiveSession.module.css";
import BreakScreen from "./BreakScreen";
import EndConfirmModal from "../components/EndConfirmModal";
import MiniSession from "../components/MiniSession";

type CaptureLabel = "on_task" | "off_task" | "ambiguous";

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
  if (pct >= 95) return "S";
  if (pct >= 85) return "A";
  if (pct >= 75) return "B";
  if (pct >= 65) return "C";
  return "D";
}

function getGradeColor(grade: string): string {
  if (grade === "S" || grade === "A") return "var(--status-green)";
  if (grade === "B") return "var(--status-amber)";
  return "var(--status-red)";
}

export default function ActiveSession({ nav, config, onEnd }: Props) {
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
    if (!config.trackingEnabled || trackingPaused || onBreak) return;

    const loop = setInterval(async () => {
      const result = await window.electronAPI.classify({
        subjects: [config.subject],
        todos: config.todos.map((t) => ({ text: t.text })),
      });
      setCaptures((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          label: result.label,
          text: result.reason,
        },
      ]);
    }, 5_000);

    return () => clearInterval(loop);
  }, [trackingPaused, onBreak]);

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
    // add off-task captures every 30s during break
    if (!breakOvertime) return;
    const tick = setInterval(() => {
      setCaptures((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          label: "off_task" as CaptureLabel,
          text: "Break overtime",
        },
      ]);
    }, 30_000);
    return () => clearInterval(tick);
  }, [breakOvertime]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const top = scrollRef.current.scrollTop;
    setScrolled((prev) => (prev ? top > 0 : top > 1));
  };

  // Focus score derived from captures
  const onTaskCount = captures.filter((c) => c.label === "on_task").length;
  const ambiguousCount = captures.filter((c) => c.label === "ambiguous").length;
  const focusScore =
    captures.length === 0
      ? 100
      : Math.round(
          ((onTaskCount + ambiguousCount * 0.5) / captures.length) * 100,
        );

  const curvedScore = Math.round(Math.sqrt(focusScore / 100) * 100);
  const grade = getGrade(curvedScore);

  const elapsedMinutes = (totalSeconds - timeLeft) / 60;
  const pointsEarned = Math.max(
    0,
    Math.round(elapsedMinutes * (focusScore / 100) * 2),
  );

  const lastLabel = captures[captures.length - 1]?.label ?? "on_task";
  const isOnTask = lastLabel !== "off_task";

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  // ── NEW: break functions ──
  const startBreak = useCallback(() => {
    window.electronAPI?.setExpandMode?.().catch?.(() => {}); // ← add this line
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
    } catch {}
    setIsMiniMode(false);
  };

  const handleEnd = async () => {
    await handleExpand();
    onEnd({
      subject: config.subject,
      durationMinutes: Math.round(elapsedMinutes),
      focusScore: curvedScore,
      pointsEarned,
      breakPenalty: 0, // wire up if you track break overtime penalty
      onTaskCount,
      totalCaptures: captures.length,
      breakMinutes: Math.round(/* track total break seconds */ 0 / 60),
      todos,
    });
  };

  const handleMiniMode = async () => {
    try {
      await window.electronAPI?.setMiniMode();
    } catch {}
    setIsMiniMode(true);
  };

  if (isMiniMode) {
    return (
      <>
        <MiniSession
          timeLeft={timeLeft}
          pointsEarned={pointsEarned}
          isOnTask={isOnTask}
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
          focusScore={curvedScore}
          pointsEarned={pointsEarned}
          completedTodos={todos.filter((t) => t.completed).length}
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
            className={`${styles.headerBadge} ${scrolled ? styles.headerBadgeVisible : ""} ${isOnTask ? styles.statusOn : styles.statusOff}`}
          >
            <span className={styles.statusDot} />
            {isOnTask ? "On task" : "Off task"}
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
                style={{ width: `${curvedScore}%` }}
              />
            </div>
          </div>
          <span
            className={`${styles.inlineGrade} ${scrolled ? styles.inlineGradeVisible : ""}`}
            style={{ color: getGradeColor(grade) }}
          >
            On track for {grade}
          </span>
        </div>

        {/* These collapse away */}
        <span
          className={`${styles.timerLabel} ${scrolled ? styles.colHide : ""}`}
        >
          {onBreak ? "on break" : "remaining"}
        </span>
        <div
          className={`${styles.statusBadge} ${scrolled ? styles.colHide : ""} ${isOnTask ? styles.statusOn : styles.statusOff}`}
        >
          <span className={styles.statusDot} />
          {isOnTask ? "On task" : "Off task"}
        </div>

        {/* Subtitle — always visible, position shifts */}
        <span
          className={`${styles.sessionSubtitle} ${scrolled ? styles.sessionSubtitleCollapsed : ""}`}
        >
          Studying {config.subject || "—"} ·{" "}
          <span className={styles.pointsEarned}>+{pointsEarned} points</span>
        </span>

        {/* Full focus bar — collapses away */}
        <div
          className={`${styles.focusBarSection} ${scrolled ? styles.colHide : ""}`}
        >
          <div className={styles.focusBarMeta}>
            <span className={styles.focusLabel}>Focus score</span>
            <span
              className={styles.gradeLabel}
              style={{ color: getGradeColor(grade) }}
            >
              {curvedScore >= 85 ? `On track for ${grade}` : `Grade: ${grade}`}
            </span>
          </div>
          <div className={styles.focusBarTrack}>
            <div
              className={styles.focusBarFill}
              style={{ width: `${curvedScore}%` }}
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
                className={`${styles.taskItem} ${t.completed ? styles.taskDone : ""}`}
                onClick={() => toggleTodo(t.id)}
              >
                <span
                  className={`${styles.taskCircle} ${t.completed ? styles.taskCircleDone : ""}`}
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
