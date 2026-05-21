export type BreakMode = 'pomodoro' | 'manual'

export type TodoItem = {
  id: string
  text: string
  completed: boolean
}

export type SessionConfig = {
  subject: string
  durationMinutes: number
  breakMode: BreakMode
  todos: TodoItem[]
  trackingEnabled: boolean
}