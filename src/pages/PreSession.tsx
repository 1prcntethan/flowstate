import { useState, useRef, useEffect } from "react";
import { SessionConfig, TodoItem, BreakMode } from "../types";
import type { Page } from "../App";
import styles from "./PreSession.module.css";

type Props = {
  nav: (p: Page) => void;
  onStart: (config: SessionConfig) => void;
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function PreSession({
  nav,
  onStart,
  subjects,
  setSubjects,
}: Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showSubjectInput, setShowSubjectInput] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");

  const [duration, setDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustomDuration, setShowCustomDuration] = useState(false);

  const [breakMode, setBreakMode] = useState<BreakMode>("manual");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoInput, setTodoInput] = useState("");
  const [trackingEnabled, setTracking] = useState(true);

  // drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- subject ---
  const addSubject = () => {
    const trimmed = subjectInput.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    setSubjects([...subjects, trimmed]);
    setSelectedSubjects((prev) => [...prev, trimmed]);
    setSubjectInput("");
    setShowSubjectInput(false);
  };

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  // --- todos ---
  const addTodo = () => {
    if (!todoInput.trim()) return;
    setTodos([
      ...todos,
      { id: Date.now().toString(), text: todoInput.trim(), completed: false },
    ]);
    setTodoInput("");
  };

  const removeTodo = (id: string) => setTodos(todos.filter((t) => t.id !== id));

  // drag and drop
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const updated = [...todos];
    const dragged = updated.splice(dragItem.current, 1)[0];
    updated.splice(dragOverItem.current, 0, dragged);
    setTodos(updated);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- start ---
  const getFinalDuration = (): number => {
    if (showCustomDuration) return parseInt(customDuration) || 0;
    return duration ?? 0;
  };

  const handleStart = () => {
    const config: SessionConfig = {
      subject: selectedSubjects.join(", "),
      durationMinutes: getFinalDuration(),
      breakMode,
      todos,
      trackingEnabled,
    };
    onStart(config);
    nav("session");
  };

  const canStart =
    selectedSubjects.length > 0 && getFinalDuration() > 0 && todos.length > 0;

  useEffect(() => {
    window.electronAPI.warmUpAI(); // no await runs automatically
  }, []);

  return (
    <div className={`page ${styles.preSessionPage}`}>
      <div className={styles.headerSection}>
        <button
          className={styles.cancelButton}
          onClick={() => nav("dashboard")}
        >
          <svg
            className={styles.cancelX}
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.8 11.25L7.5 8.55L10.2 11.25L11.25 10.2L8.55 7.5L11.25 4.8L10.2 3.75L7.5 6.45L4.8 3.75L3.75 4.8L6.45 7.5L3.75 10.2L4.8 11.25ZM7.5 15C6.4625 15 5.4875 14.8031 4.575 14.4094C3.6625 14.0156 2.86875 13.4813 2.19375 12.8063C1.51875 12.1313 0.984375 11.3375 0.590625 10.425C0.196875 9.5125 0 8.5375 0 7.5C0 6.4625 0.196875 5.4875 0.590625 4.575C0.984375 3.6625 1.51875 2.86875 2.19375 2.19375C2.86875 1.51875 3.6625 0.984375 4.575 0.590625C5.4875 0.196875 6.4625 0 7.5 0C8.5375 0 9.5125 0.196875 10.425 0.590625C11.3375 0.984375 12.1313 1.51875 12.8063 2.19375C13.4813 2.86875 14.0156 3.6625 14.4094 4.575C14.8031 5.4875 15 6.4625 15 7.5C15 8.5375 14.8031 9.5125 14.4094 10.425C14.0156 11.3375 13.4813 12.1313 12.8063 12.8063C12.1313 13.4813 11.3375 14.0156 10.425 14.4094C9.5125 14.8031 8.5375 15 7.5 15ZM7.5 13.5C9.175 13.5 10.5938 12.9188 11.7563 11.7563C12.9188 10.5938 13.5 9.175 13.5 7.5C13.5 5.825 12.9188 4.40625 11.7563 3.24375C10.5938 2.08125 9.175 1.5 7.5 1.5C5.825 1.5 4.40625 2.08125 3.24375 3.24375C2.08125 4.40625 1.5 5.825 1.5 7.5C1.5 9.175 2.08125 10.5938 3.24375 11.7563C4.40625 12.9188 5.825 13.5 7.5 13.5Z"
              fill="currentColor"
            />
          </svg>
          <span>Cancel</span>
        </button>
        <span className={styles.title}>New Session</span>
      </div>

      <div className={styles.formSection}>
        {/* SUBJECT */}
        <div className={styles.field}>
          <label className={styles.fieldTitle}>SUBJECT</label>
          <div className={styles.chips}>
            {subjects.map((s) => (
              <button
                key={s}
                className={
                  selectedSubjects.includes(s)
                    ? styles.chipSubjectActive
                    : styles.chipSubject
                }
                onClick={() => toggleSubject(s)}
              >
                {s}
              </button>
            ))}
            <button
              className={styles.chipSubjectAdd}
              onClick={() => setShowSubjectInput(!showSubjectInput)}
            >
              <img src="/AddSubjectPlus.svg" alt="+" />
            </button>
          </div>
          {showSubjectInput && (
            <div className={styles.subjectInput}>
              <input
                autoFocus
                type="text"
                placeholder="Subject name..."
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
              />
              <button onClick={addSubject}>Add</button>
            </div>
          )}
        </div>

        {/* DURATION */}
        <div className={styles.field}>
          <label className={styles.fieldTitle}>DURATION</label>
          <div className={styles.chips}>
            {[20, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                className={
                  duration === m && !showCustomDuration
                    ? styles.chipDurationActive
                    : styles.chipDuration
                }
                onClick={() => {
                  setDuration(m);
                  setShowCustomDuration(false);
                }}
              >
                {m}m
              </button>
            ))}
            <button
              className={
                showCustomDuration
                  ? styles.chipDurationActive
                  : styles.chipDuration
              }
              onClick={() => {
                setShowCustomDuration(true);
                setDuration(null);
              }}
            >
              custom
            </button>
          </div>
          {showCustomDuration && (
            <input
              autoFocus
              type="number"
              placeholder="Minutes..."
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className={styles.customDurationInput}
              min={1}
              max={480}
            />
          )}
          {((duration !== null && !showCustomDuration && duration <= 30) ||
            (showCustomDuration &&
              parseInt(customDuration) <= 30 &&
              customDuration !== "")) && (
            <p className={styles.noBreakNote}>
              Sessions 30 min or under don't include a break.
            </p>
          )}
        </div>

        {/* BREAK STYLE */}
        <div className={styles.field}>
          <label className={styles.fieldTitle}>BREAK STYLE</label>
          <div className={styles.chips}>
            {(["pomodoro", "manual"] as BreakMode[]).map((mode) => (
              <button
                key={mode}
                className={
                  breakMode === mode ? styles.chipBreakActive : styles.chipBreak
                }
                onClick={() => setBreakMode(mode)}
              >
                <span className={styles.breakTitle}>
                  {mode === "pomodoro" ? "Pomodoro" : "Manual"}
                </span>
                <span className={styles.breakText}>
                  {mode === "pomodoro"
                    ? "Auto-break 25/5 min, or 50/10 min for longer sessions"
                    : "Take breaks as needed, unlocks every 25 min or 45 min for longer sessions"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* TODO LIST */}
        <div className={styles.field}>
          <label className={styles.fieldTitle}>TODO LIST</label>
          <div className={styles.todoInput}>
            <input
              type="text"
              placeholder="Add a task..."
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
            />
            <button onClick={addTodo}>
              <img src="/AddTaskPlus.svg" alt="+" />
            </button>
          </div>
          {todos.map((t, index) => (
            <div
              key={t.id}
              className={styles.todoItem}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <img
                src="/MoveSelector.svg"
                alt="drag"
                style={{ cursor: "grab" }}
              />
              <span>{t.text}</span>
              <button onClick={() => removeTodo(t.id)}>×</button>
            </div>
          ))}
        </div>

        {/* TRACKING */}
        <div className={styles.field}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <img className={styles.trackingEye} src="TrackingEye.svg" />
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Track my screen</span>
                <span className={styles.toggleDesc}>
                  Focus tracking earns you coins based on your focus score.
                </span>
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={trackingEnabled}
                onChange={(e) => setTracking(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        {/* START */}
        <button
          className={styles.startButton}
          onClick={handleStart}
          disabled={!canStart}
        >
          Start focusing →
        </button>
      </div>
    </div>
  );
}
