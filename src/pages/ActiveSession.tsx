// pages/ActiveSession.tsx
import type { Page } from "../App";
import { SessionConfig } from "../types";
import styles from "./ActiveSession.module.css";

type Props = {
  nav: (p: Page) => void;
  config: SessionConfig;
};

export default function ActiveSession({ nav, config }: Props) {
  return (
    <div className="page">
      <h1>Session active</h1>

      <div className={styles.debugCard}>
        <p>
          <strong>Subject:</strong> {config.subject}
        </p>
        <p>
          <strong>Duration:</strong> {config.durationMinutes} minutes
        </p>
        <p>
          <strong>Break mode:</strong> {config.breakMode}
        </p>
        <p>
          <strong>Tracking:</strong> {config.trackingEnabled ? "on" : "off"}
        </p>
        <p>
          <strong>Todos ({config.todos.length}):</strong>
        </p>
        <ul>
          {config.todos.map((t) => (
            <li key={t.id}>{t.text}</li>
          ))}
        </ul>
      </div>

      <button onClick={() => nav("dashboard")}>End session (test)</button>
    </div>
  );
}
