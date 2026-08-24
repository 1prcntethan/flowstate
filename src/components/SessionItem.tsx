import styles from './SessionItem.module.css'
import type { Session } from "../types"

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

export function SessionItem({ session }: { session: Session }) {
  const time = sessionTimestamp(session.sessionId);
  return (
    <div className={styles.sessionItem}>
      <div className={styles.sessionItemMain}>
        <span className={styles.sessionSubject}>{session.subject}</span>
        <span className={styles.sessionTime}>{formatRelativeTime(time)}</span>
      </div>
      <div className={styles.sessionItemStats}>
        <span>{session.durationMinutes}m</span>
        <span>{session.focusScore}% focus</span>
        <span>+{session.pointsEarned} coins</span>
      </div>
    </div>
  );
}