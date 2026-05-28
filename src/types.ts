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

export type User = {
  id: string
  name: string
  coins: number
  streak: number
}

export type UserCosmetics = {
  equippedThemeId: string
  equippedAvatarFrameId: string | null
  equippedCompanionId: string | null
  equippedTimerStyleId: string | null
  ownedItemIds: string[]
}