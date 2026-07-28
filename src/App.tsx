import { useEffect, useState } from "react";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import PreSession from "./pages/PreSession";
import ActiveSession from "./pages/ActiveSession";
import SessionEnd from "./pages/SessionEnd";
import Settings from "./pages/Settings";
import { SessionConfig } from "./types";
import { useTheme } from "./useTheme";
import type { User, TodoItem } from "./types";
import Onboarding from "./onboarding/Onboarding";
import { useAuth } from "./auth/AuthContext";

export type Page =
  | "dashboard"
  | "presession"
  | "session"
  | "sessionend"
  | "settings";

// Shape passed from ActiveSession → SessionEnd
export type SessionResult = {
  subject: string;
  durationMinutes: number;
  focusScore: number;
  pointsEarned: number;
  breakPenalty: number;
  onTaskCount: number;
  totalCaptures: number;
  breakMinutes: number;
  todos: TodoItem[];
};

const DEFAULT_SUBJECTS = [
  "Math",
  "Science",
  "CS",
  "English",
  "History",
  "Language",
];

export default function App() {
  const { user, authChecked, hasCompletedOnboarding, onboardingChecked } =
    useAuth();
  const { themeId, setThemeId } = useTheme();
  const [page, setPage] = useState<Page>("dashboard");
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
    null,
  );
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(
    null,
  );

  const nav = (p: Page) => setPage(p);
  const handleSessionEnd = (result: SessionResult) => {
    setSessionResult(result);
    setPage("sessionend");
  };
  
  if (!authChecked || !onboardingChecked) return null;

  if (!hasCompletedOnboarding) {
    return <Onboarding />; // brand new device — starts at Welcome
  }

  if (!user) {
    return <Onboarding startAt="auth" />; // seen this before, just needs to log in
  }

  if (page === "dashboard") return <Dashboard nav={nav} user={user} />;
  if (page === "presession")
    return (
      <PreSession
        nav={nav}
        onStart={setSessionConfig}
        subjects={subjects}
        setSubjects={setSubjects}
      />
    );
  if (page === "session")
    return (
      <ActiveSession
        nav={nav}
        config={sessionConfig!}
        onEnd={handleSessionEnd}
      />
    );
  if (page === "sessionend")
    return (
      <SessionEnd
        nav={nav}
        subject={sessionResult?.subject ?? ""}
        durationMinutes={sessionResult?.durationMinutes ?? 0}
        focusScore={sessionResult?.focusScore ?? 0}
        pointsEarned={sessionResult?.pointsEarned ?? 0}
        breakPenalty={sessionResult?.breakPenalty ?? 0}
        onTaskCount={sessionResult?.onTaskCount ?? 0}
        totalCaptures={sessionResult?.totalCaptures ?? 0}
        breakMinutes={sessionResult?.breakMinutes ?? 0}
        todos={sessionResult?.todos ?? []}
        streak={user.streak}
      />
    );
  if (page === "settings")
    return (
      <Settings
        nav={nav}
        user={user}
        subjects={subjects}
        setSubjects={setSubjects}
      />
    );
}
