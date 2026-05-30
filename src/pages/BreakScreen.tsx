import { useState } from "react"
import styles from "./BreakScreen.module.css"

const TIPS = [
  "Stand up and stretch.",
  "Look away from your screen for 20 seconds.",
  "Drink some water.",
  "Take a few deep breaths.",
  "Walk around the room.",
  "Close your eyes for 30 seconds.",
  "Roll your shoulders back a few times.",
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

type Props = {
  breakElapsed: number
  breakLimitSecs: number
  isOvertime: boolean
  focusScore: number
  pointsEarned: number
  completedTodos: number
  totalTodos: number
  onResume: () => void
  onEnd: () => void
}

export default function BreakScreen({
  breakElapsed, breakLimitSecs, isOvertime,
  focusScore, pointsEarned, completedTodos, totalTodos,
  onResume, onEnd,
}: Props) {
  const [tipIndex, setTipIndex] = useState(0)


  return (
    <div className="page">
      <div className={styles.container}>

        <div className={styles.timerSection}>
          <span className={styles.breakLabel}>BREAK TIME</span>
          <span className={styles.timerDisplay}>{formatTime(breakElapsed)}</span>
          <span className={styles.timerSub}>
            {isOvertime
              ? `overtime · limit was ${formatTime(breakLimitSecs)}`
              : "break elapsed"}
          </span>
        </div>

        {isOvertime && (
          <div className={styles.overtimeBanner}>
            Break overtime—points paused
          </div>
        )}

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue} style={{ color: "var(--status-green)" }}>
              {focusScore}%
            </span>
            <span className={styles.statLabel}>Focus</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue} style={{ color: "var(--status-amber)" }}>
              +{pointsEarned}
            </span>
            <span className={styles.statLabel}>Points</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {completedTodos}/{totalTodos}
            </span>
            <span className={styles.statLabel}>Tasks</span>
          </div>
        </div>

        <div className={styles.tipCard}>
          <span className={styles.tipText}>{TIPS[tipIndex]}</span>
          <button
            className={styles.nextBtn}
            onClick={() => setTipIndex(i => (i + 1) % TIPS.length)}
          >
            next
          </button>
        </div>

        <button
          className={`${styles.resumeBtn} ${isOvertime ? styles.resumeBtnOvertime : ""}`}
          onClick={onResume}
        >
          {isOvertime ? "Your scheduled break has ended — resume" : "Resume session"}
        </button>

        <button className={styles.endBtn} onClick={onEnd}>
          <span className={styles.endIcon}>□</span>
          End session
        </button>

      </div>
    </div>
  )
}