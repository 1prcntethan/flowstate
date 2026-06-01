import styles from "./MiniSession.module.css";

type Props = {
  timeLeft: number;
  pointsEarned: number;
  isOnTask: boolean;
  trackingPaused: boolean;
  onExpand: () => void;
  onTogglePause: () => void;
  onEnd: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MiniSession({
  timeLeft,
  pointsEarned,
  isOnTask,
  trackingPaused,
  onExpand,
  onTogglePause,
  onEnd,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div className={styles.topleft}>
          <span className={styles.timer}>{formatTime(timeLeft)}</span>
          <span className={styles.points}>+{pointsEarned} points</span>
        </div>
        <span
          className={`${styles.dot} ${isOnTask ? styles.dotOn : styles.dotOff}`}
        />
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} onClick={onExpand} title="Expand">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>

        <button
          className={`${styles.iconBtn} ${trackingPaused ? styles.iconBtnActive : ""}`}
          onClick={onTogglePause}
          title={trackingPaused ? "Resume tracking" : "Pause tracking"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>

        <button
          className={`${styles.iconBtn} ${styles.iconBtnEnd}`}
          onClick={onEnd}
          title="End session"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
