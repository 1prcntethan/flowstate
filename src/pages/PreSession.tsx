import { useState, useRef } from "react";
import { SessionConfig, TodoItem, BreakMode } from "../types";
import type { Page } from "../App";
import styles from "./PreSession.module.css";

type Props = {
  nav: (p: Page) => void;
  onStart: (config: SessionConfig) => void;
};

const DEFAULT_SUBJECTS = [
  "Math",
  "Science",
  "CS",
  "English",
  "History",
  "Language",
];

export default function PreSession({ nav, onStart }: Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
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
    setSelectedSubjects(prev => [...prev, trimmed]);
    setSubjectInput("");
    setShowSubjectInput(false);
  };

  const toggleSubject = (s: string) => {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

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
    selectedSubjects.length > 0 &&
    getFinalDuration() > 0 &&
    todos.length > 0;

  return (
    <div className="page">
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
        {/* SUBJECT */}
        <div className={styles.field}>
          <label className={styles.fieldTitle}>SUBJECT</label>
          <div className={styles.chips}>
            {subjects.map((s) => (
              <button
                key={s}
                className={
                  selectedSubjects.includes(s) ? styles.chipSubjectActive : styles.chipSubject
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
            <div className={styles.todoInput}>
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
                    ? "Auto-break every 25 minutes"
                    : "Take breaks as needed"}
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
              <img className={styles.trackingEye} src="TrackingEye.svg"/>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Track my screen</span>
                <span className={styles.toggleDesc}>Focus tracking + full points?????</span>
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
