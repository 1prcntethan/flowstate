import { useState } from "react";
import type { Page } from "../App";
import type { TodoItem } from "../types";
import styles from "./SessionEnd.module.css";

type Props = {
  nav: (p: Page) => void;
  subject: string;
  durationMinutes: number;
  focusScore: number;       // 0–100 curved score
  pointsEarned: number;
  breakPenalty: number;     // points deducted for break overtime
  onTaskCount: number;
  totalCaptures: number;
  breakMinutes: number;
  todos: TodoItem[];
  streak: number;
};

export default function SessionEnd({
  nav,
  subject,
  durationMinutes,
  focusScore,
  pointsEarned,
  breakPenalty,
  onTaskCount,
  totalCaptures,
  breakMinutes,
  todos,
  streak,
}: Props) {
  const [carryIncomplete, setCarryIncomplete] = useState(false);

  const completedCount = todos.filter((t) => t.completed).length;
  const incompleteCount = todos.length - completedCount;
  const incompletePenalty = incompleteCount * 10;
  const focusPoints = pointsEarned + breakPenalty + incompletePenalty;

  const headline =
    focusScore >= 90
      ? "Amazing session!"
      : focusScore >= 75
        ? "Great session!"
        : focusScore >= 60
          ? "Good effort!"
          : "Keep going!";

  return (
    <div className={styles.page}>
      <div className={styles.scrollArea}>

        {/* ── Card graphic ── */}
        <div className={styles.cardWrap}>
          <div className={styles.gradeCard} />
        </div>

        {/* ── Headline ── */}
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.subline}>
          {subject}—{durationMinutes} minutes
        </p>

        {/* ── Points ── */}
        <div className={styles.pointsBlock}>
          <span className={styles.pointsNumber}>+{pointsEarned}</span>
          <span className={styles.pointsLabel}>points earned</span>
          <div className={styles.pointsBreakdown}>
            <span className={styles.pointsPos}>+ {focusPoints} focus</span>
            <span className={styles.pointsNeg}>-{breakPenalty} breaks</span>
            <span className={styles.pointsNeg}>-{incompletePenalty} incomplete</span>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{durationMinutes}m</span>
            <span className={styles.statLabel}>Duration</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{focusScore}%</span>
            <span className={styles.statLabel}>Focus</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {onTaskCount}/{totalCaptures}
            </span>
            <span className={styles.statLabel}>On-task</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{breakMinutes}m</span>
            <span className={styles.statLabel}>Break</span>
          </div>
        </div>

        {/* ── Task completion ── */}
        <div className={styles.taskSection}>
          <span className={styles.taskSectionTitle}>TASK COMPLETION</span>
          {todos.map((t) => (
            <div key={t.id} className={styles.taskRow}>
              <span
                className={`${styles.taskDot} ${t.completed ? styles.taskDotDone : styles.taskDotMiss}`}
              />
              <span
                className={`${styles.taskText} ${t.completed ? styles.taskTextDone : ""}`}
              >
                {t.text}
              </span>
            </div>
          ))}
        </div>

        {/* ── Streak ── */}
        {streak > 0 && (
          <div className={styles.streakPill}>
            🔥 {streak} Day streak!
          </div>
        )}

        {/* ── Carry toggle ── */}
        {incompleteCount > 0 && (
          <div className={styles.carryRow}>
            <span className={styles.carryLabel}>
              Carry {incompleteCount} incomplete task
              {incompleteCount !== 1 ? "s" : ""} to next session?
            </span>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={carryIncomplete}
                onChange={(e) => setCarryIncomplete(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        )}

        {/* ── Actions ── */}
        <button className={styles.dashBtn} onClick={() => nav("dashboard")}>
          Back to dashboard
        </button>
        <button className={styles.shareBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share session
        </button>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}