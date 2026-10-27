export const LIST_MAX = 10;
export const TODO_TEXT_MAX = 100;
export const SUBJECT_NAME_MAX = 100;

const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  "g",
);

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  order: number;
  completedAt?: string;
};

/** Shape that may come from a session saved before `done` existed. */
export type StoredTodo = {
  id?: string;
  text?: string;
  done?: boolean;
  completed?: boolean;
  order?: number;
  completedAt?: string;
};

export type TextIssue = "empty" | "too_long";
export type ListIssue = TextIssue | "full" | "duplicate";

export function cleanText(raw: string): string {
  return raw.replace(CONTROL_CHARS, "").trim();
}

export function validateBoundedText(
  raw: string,
  maxLength: number,
): { ok: true; text: string } | { ok: false; reason: TextIssue } {
  const text = cleanText(raw);
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > maxLength) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}

/** Defensive copy for the classifier. Screen text is not included. */
export function todoTextForClassifier(text: string): string {
  return cleanText(text).slice(0, TODO_TEXT_MAX);
}

export function isTodoDone(todo: { done?: boolean; completed?: boolean }): boolean {
  if (typeof todo.done === "boolean") return todo.done;
  return todo.completed === true;
}

export function withOrder(todos: readonly TodoItem[]): TodoItem[] {
  return todos.map((todo, order) => ({ ...todo, order }));
}

/**
 * UI limits. Phase 4 must reject the same rules in the Lambda
 * (max 10, max length, empty and control characters).
 */
export function createTodo(
  rawText: string,
  order: number,
): { ok: true; todo: TodoItem } | { ok: false; reason: TextIssue } {
  const parsed = validateBoundedText(rawText, TODO_TEXT_MAX);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    todo: {
      id: crypto.randomUUID(),
      text: parsed.text,
      done: false,
      order,
    },
  };
}

export function addTodo(
  existing: readonly TodoItem[],
  rawText: string,
): { ok: true; todos: TodoItem[] } | { ok: false; reason: ListIssue } {
  if (existing.length >= LIST_MAX) return { ok: false, reason: "full" };
  const created = createTodo(rawText, existing.length);
  if (!created.ok) return created;
  return { ok: true, todos: [...existing, created.todo] };
}

export function toggleTodo(
  todos: readonly TodoItem[],
  id: string,
  nowIso: string,
): TodoItem[] {
  return todos.map((todo) => {
    if (todo.id !== id) return todo;
    if (todo.done) {
      return { id: todo.id, text: todo.text, done: false, order: todo.order };
    }
    return { ...todo, done: true, completedAt: nowIso };
  });
}

export function normalizeStoredTodo(raw: StoredTodo, index: number): TodoItem | null {
  const parsed = validateBoundedText(raw.text ?? "", TODO_TEXT_MAX);
  if (!parsed.ok) return null;
  const done = isTodoDone(raw);
  const todo: TodoItem = {
    id: raw.id && raw.id.length > 0 ? raw.id : crypto.randomUUID(),
    text: parsed.text,
    done,
    order: typeof raw.order === "number" ? raw.order : index,
  };
  if (done && typeof raw.completedAt === "string" && raw.completedAt.length > 0) {
    todo.completedAt = raw.completedAt;
  }
  return todo;
}

export function normalizeStoredTodos(raw: readonly StoredTodo[]): TodoItem[] {
  return raw
    .map((todo, index) => normalizeStoredTodo(todo, index))
    .filter((todo): todo is TodoItem => todo !== null);
}

export function addSubject(
  existing: readonly string[],
  raw: string,
): { ok: true; subjects: string[] } | { ok: false; reason: ListIssue } {
  const parsed = validateBoundedText(raw, SUBJECT_NAME_MAX);
  if (!parsed.ok) return parsed;
  if (existing.includes(parsed.text)) return { ok: false, reason: "duplicate" };
  if (existing.length >= LIST_MAX) return { ok: false, reason: "full" };
  return { ok: true, subjects: [...existing, parsed.text] };
}

export function listIssueMessage(reason: ListIssue, noun: "task" | "subject"): string {
  if (reason === "empty") return noun === "task" ? "Enter a task." : "Enter a subject name.";
  if (reason === "too_long") return "Keep it to 100 characters.";
  if (reason === "full") {
    return noun === "task" ? "You can add up to 10 tasks." : "You can save up to 10 subjects.";
  }
  return noun === "task" ? "That task is already on the list." : "That subject is already saved.";
}
