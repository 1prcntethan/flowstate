import { useState } from "react";
import { SessionConfig, TodoItem, BreakMode } from '../types'
import type { Page } from "../App";
import styles from "./PreSession.module.css";

type Props = { nav: (p: Page) => void };

export default function PreSession({ nav }: Props) {

  const [duration, setDuration] = useState('');
  const [subject, setSubject] = useState(45);
  const [breakMode, setBreakMode] = useState<BreakMode>('manual')
  console.log("selected duration: ", duration, "selected subject", subject);
  console.log("break type: ", breakMode)


  return (
    <div>
      <div className={styles.headerSection}>
        <button
          className={styles.cancelButton}
          onClick={() => nav("dashboard")}
        >
          <img className={styles.cancelX} src="/CancelX.svg" alt="X" />
          <span>Cancel</span>
        </button>
        <span className={styles.title}>New Session</span>
      </div>
      <div className={styles.formSection}>
        <div className={styles.field}>
          <label className={styles.fieldTitle}>SUBJECT</label>
          <div className={styles.chips}>
            {["Math", "Science", "CS", "English", "History", "Language", "Add+"].map((s) => (
              <button
                key={s}
                className={subject === s ? styles.chipSubjectActive : styles.chipSubject}
                onClick={() => setSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldTitle}>DURATION</label>
          <div className={styles.chips}>
            {[25, 45, 60, 90].map((m) => (
              <button
                key={m}
                className={duration === m ? styles.chipDurationActive : styles.chipDuration}
                onClick={() => setDuration(m)}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldTitle}>Break style</label>
          <div className={styles.chips}>
            <button
              className={breakMode === 'pomodoro' ? styles.chipActive : styles.chip}
              onClick={() => setBreakMode('pomodoro')}
            >
              Pomodoro
            </button>
            <button
              className={breakMode === 'manual' ? styles.chipActive : styles.chip}
              onClick={() => setBreakMode('manual')}
            >
              Manual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
