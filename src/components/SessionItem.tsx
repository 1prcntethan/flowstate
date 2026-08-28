import styles from "./SessionItem.module.css";
import type { Session } from "../types";

function sessionTimestamp(sessionId: string): Date {
  return new Date(sessionId.replace("SESSION#", ""));
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function durationHours(minutes: number): number {
  return Math.floor(minutes / 60);
}

function durationExtra(minutes: number): number {
  return minutes % 60;
}

function returnGrade(score: number) {
  if (score >= 97) {
    return <span className={styles.sessionGreen}>A+</span>;
  } else if (score >= 93) {
    return <span className={styles.sessionGreen}>A</span>;
  } else if (score >= 90) {
    return <span className={styles.sessionGreen}>A-</span>;
  } else if (score >= 87) {
    return <span className={styles.sessionAmber}>B+</span>;
  } else if (score >= 83) {
    return <span className={styles.sessionAmber}>B</span>;
  } else if (score >= 80) {
    return <span className={styles.sessionAmber}>B-</span>;
  } else if (score >= 77) {
    return <span className={styles.sessionAmber}>C+</span>;
  } else if (score >= 73) {
    return <span className={styles.sessionAmber}>C</span>;
  } else if (score >= 70) {
    return <span className={styles.sessionAmber}>C-</span>;
  } else if (score >= 67) {
    return <span className={styles.sessionRed}>D+</span>;
  } else if (score >= 63) {
    return <span className={styles.sessionRed}>D</span>;
  } else if (score >= 60) {
    return <span className={styles.sessionRed}>D-</span>;
  } else {
    return <span className={styles.sessionRed}>F</span>;
  }
}

export function SessionItem({ session }: { session: Session }) {
  const time = sessionTimestamp(session.sessionId);
  return (
    <div className={styles.sessionItem}>
      <div className={styles.sessionItemLeft}>
        {returnGrade(session.focusScore)}
        <span className={styles.focusScore}>{session.focusScore}% focus</span>
      </div>
      <div className={styles.sessionItemMid}>
        <span className={styles.sessionSubject}>{session.subject}</span>
        <span className={styles.sessionDuration}>
          {durationHours(session.durationMinutes)}h{" "}
          {durationExtra(session.durationMinutes)}m
        </span>
      </div>
      <div className={styles.sessionItemRight}>
        <span className={styles.sessionCoins}>+{session.pointsEarned} coins</span>
        <span className={styles.sessionTime}>{formatRelativeTime(time)}</span>
      </div>
    </div>
  );
}
