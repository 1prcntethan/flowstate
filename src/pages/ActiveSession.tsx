import { useState, useEffect, useRef } from "react";
import type { Page } from "../App";
import type { SessionConfig } from "../types";
import styles from "./ActiveSession.module.css";

type CaptureLabel = "on_task" | "off_task" | "ambiguous";

type CaptureEntry = {
  id: string;
  label: CaptureLabel;
  text: string;
};

type Props = {
  nav: (p: Page) => void;
  config: SessionConfig;
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

export default function ActiveSession({ nav, config }: Props) {
  const [timeLeft, setTimeLeft] = useState(config.durationMinutes * 60);
  const [todos, setTodos] = useState(config.todos);
  const [trackingPaused, setTrackingPaused] = useState(false);
  const [onBreak, setOnBreak] = useState(false);

  // Mock captures — will be replaced with real classifier output
  const [captures, setCaptures] = useState<CaptureEntry[]>([
    { id: "1", label: "on_task", text: `${config.subject} PDF: Chapter 5` },
    { id: "2", label: "on_task", text: `${config.subject} PDF: Chapter 5` },
    { id: "3", label: "off_task", text: "YouTube video feed" },
    { id: "4", label: "on_task", text: `${config.subject} PDF: Chapter 5` },
  ]);

  // Countdown timer
  useEffect(() => {
    if (onBreak) return;
    if (timeLeft <= 0) {
      nav("sessionend");
      return;
    }
    const tick = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(tick);
  }, [timeLeft, onBreak]);

  // Focus score derived from captures
  const onTaskCount = captures.filter(
    (c) => c.label === "on_task" || c.label === "ambiguous",
  ).length;
  const focusScore =
    captures.length === 0
      ? 100
      : Math.round((onTaskCount / captures.length) * 100);

  // Curve: square root — rewards consistency, softens occasional slip
  const curvedScore = Math.round(Math.sqrt(focusScore / 100) * 100);
  const grade = getGrade(curvedScore);

  // Points earned so far
  const totalSeconds = config.durationMinutes * 60;
  const elapsedMinutes = (totalSeconds - timeLeft) / 60;
  const pointsEarned = Math.max(
    0,
    Math.round(elapsedMinutes * (focusScore / 100) * 2),
  );

  // Current status from last capture
  const lastLabel = captures[captures.length - 1]?.label ?? "on_task";
  const isOnTask = lastLabel !== "off_task";

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  return (
    <div className="page">
      <div className={styles.header}>
        <img src="/logo512.svg" className={styles.pageLogo} />
        <div className={styles.headerButtons}>
          <button
            className={`${styles.headerBtn} ${trackingPaused ? styles.headerBtnActive : ""}`}
            onClick={() => setTrackingPaused((p) => !p)}
          >
            {trackingPaused ? "Resume tracking" : "Pause tracking"}
          </button>
          <button className={styles.headerBtn} onClick={() => {}}>
            Mini mode
          </button>
        </div>
      </div>

      {/* ── Timer ── */}
      <div className={styles.timerSection}>
        <span className={styles.timerDisplay}>{formatTime(timeLeft)}</span>
        <span className={styles.timerLabel}>
          {onBreak ? "on break" : "remaining"}
        </span>
        <div
          className={`${styles.statusBadge} ${
            isOnTask ? styles.statusOn : styles.statusOff
          }`}
        >
          <span className={styles.statusDot} />
          {isOnTask ? "On task" : "Off task"}
        </div>
        <span className={styles.sessionSubtitle}>
          Studying {config.subject || "—"} ·{" "}
          <span className={styles.pointsEarned}>+{pointsEarned} points</span>
        </span>
      </div>

      {/* ── Focus bar ── */}
      <div className={styles.focusBarSection}>
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

      {/* ── Tasks + Captures ── */}
      <div className={styles.columns}>
        {/* Tasks */}
        <div className={styles.column}>
          <span className={styles.columnTitle}>TASKS</span>
          {todos.map((t) => (
            <button
              key={t.id}
              className={`${styles.taskItem} ${t.completed ? styles.taskDone : ""}`}
              onClick={() => toggleTodo(t.id)}
            >
              <span
                className={`${styles.taskCircle} ${
                  t.completed ? styles.taskCircleDone : ""
                }`}
              />
              <span className={styles.taskText}>{t.text}</span>
            </button>
          ))}
        </div>

        {/* Captures */}
        <div className={styles.column}>
          <span className={styles.columnTitle}>CAPTURES</span>
          {captures.length === 0 && (
            <span className={styles.emptyState}>No captures yet</span>
          )}
          {[...captures].reverse().map((c) => (
            <div
              key={c.id}
              className={`${styles.captureItem} ${
                c.label === "off_task" ? styles.captureOff : styles.captureOn
              }`}
            >
              <span
                className={`${styles.captureDot} ${
                  c.label === "off_task"
                    ? styles.captureDotOff
                    : styles.captureDotOn
                }`}
              />
              <span className={styles.captureText}>{c.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom actions ── */}
      <div className={styles.bottomBar}>
        <button
          className={styles.breakBtn}
          onClick={() => setOnBreak((b) => !b)}
        >
          {onBreak ? "Resume session" : "Take a break"}
        </button>
        <button className={styles.endBtn} onClick={() => nav("sessionend")}>
          End
        </button>
      </div>
    </div>
  );
}
