import { useState } from "react";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import PreSession from "./pages/PreSession";
import ActiveSession from "./pages/ActiveSession";
import { SessionConfig } from "./types";
import { useTheme } from './useTheme'
import type { User } from './types'
// import SessionEnd from './pages/SessionEnd'

export type Page = "dashboard" | "presession" | "session" | "sessionend";

export default function App() {
  const { themeId, setThemeId } = useTheme()  // applies on mount + change

  const [page, setPage] = useState<Page>("dashboard")
  const [user, setUser] = useState<User>({
    id: 'local',
    name: 'Alexis',
    coins: 320,
    streak: 7,
  })
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null)

  const nav = (p: Page) => setPage(p);

  if (page === 'dashboard')  return <Dashboard nav={nav} user={user} />
  if (page === 'presession') return <PreSession nav={nav} onStart={setSessionConfig} />
  if (page === 'session')    return <ActiveSession nav={nav} config={sessionConfig!} />
  // if (page === 'sessionend') return <SessionEnd nav={nav} user={user} />
}
