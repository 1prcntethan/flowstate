import type { TodoItem } from "./todos";

export type { TodoItem };

export type BreakMode = 'pomodoro' | 'manual'

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
  subjects: string[]
}

export type UserCosmetics = {
  equippedThemeId: string
  equippedAvatarFrameId: string | null
  equippedCompanionId: string | null
  equippedTimerStyleId: string | null
  ownedItemIds: string[]
}

export type Session = {
  sessionId: string;
  subject: string;
  durationMinutes: number;
  focusScore: number;
  pointsEarned: number;
};