import { describe, expect, it } from "vitest";
import {
  LIST_MAX,
  TODO_TEXT_MAX,
  addSubject,
  addTodo,
  normalizeStoredTodo,
  todoTextForClassifier,
  toggleTodo,
  validateBoundedText,
  type TodoItem,
} from "../src/todos";

describe("todo validation", () => {
  it("trims whitespace, strips control characters, and rejects empty text", () => {
    expect(validateBoundedText("  read ch. 2 \n", TODO_TEXT_MAX)).toEqual({
      ok: true,
      text: "read ch. 2",
    });
    expect(validateBoundedText(" \t\n ", TODO_TEXT_MAX)).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(validateBoundedText("", TODO_TEXT_MAX).ok).toBe(false);
  });

  it("rejects text over 100 characters and caps the classifier copy", () => {
    const long = "a".repeat(101);
    expect(validateBoundedText(long, TODO_TEXT_MAX)).toEqual({
      ok: false,
      reason: "too_long",
    });
    expect(validateBoundedText("a".repeat(100), TODO_TEXT_MAX).ok).toBe(true);
    expect(todoTextForClassifier(`  ${"b".repeat(140)}\n`).length).toBe(100);
  });

  it("allows at most 10 todos and assigns order", () => {
    let todos: TodoItem[] = [];
    for (let i = 0; i < LIST_MAX; i += 1) {
      const added = addTodo(todos, `task ${i}`);
      expect(added.ok).toBe(true);
      if (added.ok) todos = added.todos;
    }
    expect(todos).toHaveLength(10);
    expect(todos.map((todo) => todo.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(addTodo(todos, "one more")).toEqual({ ok: false, reason: "full" });
    expect(todos[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("sets completedAt when a task is marked done and clears it when undone", () => {
    const added = addTodo([], "outline");
    if (!added.ok) throw new Error("expected todo");
    const done = toggleTodo(added.todos, added.todos[0].id, "2026-10-27T18:00:00.000Z");
    expect(done[0]?.done).toBe(true);
    expect(done[0]?.completedAt).toBe("2026-10-27T18:00:00.000Z");
    const undone = toggleTodo(done, done[0].id, "2026-10-27T19:00:00.000Z");
    expect(undone[0]?.done).toBe(false);
    expect(undone[0]?.completedAt).toBeUndefined();
  });

  it("reads the old completed field", () => {
    const todo = normalizeStoredTodo(
      { id: "old-1", text: "  legacy task  ", completed: true, order: 2 },
      0,
    );
    expect(todo).toMatchObject({
      id: "old-1",
      text: "legacy task",
      done: true,
      order: 2,
    });
    expect(todo?.completedAt).toBeUndefined();
    const undone = normalizeStoredTodo({ text: "still open", completed: false }, 4);
    expect(undone?.done).toBe(false);
    expect(undone?.order).toBe(4);
  });
});

describe("subjects", () => {
  it("uses the same max count and max length", () => {
    expect(addSubject(["Math"], "  Physics \n")).toEqual({
      ok: true,
      subjects: ["Math", "Physics"],
    });
    expect(addSubject(["Math"], "Math")).toEqual({ ok: false, reason: "duplicate" });
    expect(addSubject(["Math"], "   ")).toEqual({ ok: false, reason: "empty" });
    expect(addSubject([], "z".repeat(101))).toEqual({ ok: false, reason: "too_long" });
    const full = Array.from({ length: LIST_MAX }, (_, i) => `s${i}`);
    expect(addSubject(full, "extra")).toEqual({ ok: false, reason: "full" });
  });
});
