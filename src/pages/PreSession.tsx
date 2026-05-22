import { useState } from "react";
import { SessionConfig, TodoItem, BreakMode } from "../types";
import type { Page } from "../App";
import styles from "./PreSession.module.css";

type Props = { nav: (p: Page) => void };

export default function PreSession({ nav }: Props) {
  const [duration, setDuration] = useState("");
  const [subject, setSubject] = useState(45);
  const [breakMode, setBreakMode] = useState<BreakMode>("manual");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoInput, setTodoInput] = useState("");

  console.log("selected duration: ", duration, "selected subject", subject);
  console.log("break type: ", breakMode);
  console.log("todos: ", todos);

  const addTodo = () => {
    if (!todoInput.trim()) return
    setTodos([...todos, { id: Date.now().toString(), text: todoInput.trim(), completed: false }])
    setTodoInput('')
  }

  const removeTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id))
  }

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
            {[
              "Math",
              "Science",
              "CS",
              "English",
              "History",
              "Language",
              "Add+",
            ].map((s) => (
              <button
                key={s}
                className={
                  subject === s ? styles.chipSubjectActive : styles.chipSubject
                }
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
            {[20, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                className={
                  duration === m
                    ? styles.chipDurationActive
                    : styles.chipDuration
                }
                onClick={() => setDuration(m)}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldTitle}>BREAK STYLE</label>
          <div className={styles.chips}>
            <button
              className={
                breakMode === "pomodoro"
                  ? styles.chipBreakActive
                  : styles.chipBreak
              }
              onClick={() => setBreakMode("pomodoro")}
            >
              <span className={styles.breakTitle}>Pomodoro</span>
              <span className={styles.breakText}>Auto-break every 25 minutes</span>
            </button>
            <button
              className={
                breakMode === "manual"
                  ? styles.chipBreakActive
                  : styles.chipBreak
              }
              onClick={() => setBreakMode("manual")}
            >
              <span className={styles.breakTitle}>Manual</span>
              <span className={styles.breakText}>Take breaks as needed</span>
            </button>
          </div>
        </div>
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
          {todos.map((t) => (
            <div key={t.id} className={styles.todoItem}>
              <span>{t.text}</span>
              <button onClick={() => removeTodo(t.id)}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
