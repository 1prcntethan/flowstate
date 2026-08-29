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
import styles from "./App.module.css";

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
  const {
    user,
    updateCoins,
    authChecked,
    hasCompletedOnboarding,
    onboardingChecked,
  } = useAuth();
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
  const handleSessionEnd = async (result: SessionResult) => {
    console.log("attempt handle session end")
    setSessionResult(result);
    setPage("sessionend");

    await updateCoins(result.pointsEarned);
    console.log("update coins success")

    window.electronAPI
      .saveSession({ userId: user!.id, result })
      .catch((err) => console.error("Failed to save session:", err));
    console.log("save session attempted")
  };

  if (!authChecked || !onboardingChecked) return null;

  let content: React.ReactNode;

  if (!hasCompletedOnboarding) {
    content = <Onboarding />; // brand new device — starts at Welcome
  } else if (!user) {
    content = <Onboarding startAt="auth" />; // seen this before, just needs to log in
  } else if (page === "dashboard") {
    content = <Dashboard nav={nav} user={user} />;
  } else if (page === "presession") {
    content = (
      <PreSession
        nav={nav}
        onStart={setSessionConfig}
        subjects={subjects}
        setSubjects={setSubjects}
      />
    );
  } else if (page === "session") {
    content = (
      <ActiveSession
        nav={nav}
        config={sessionConfig!}
        onEnd={handleSessionEnd}
      />
    );
  } else if (page === "sessionend") {
    content = (
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
  } else if (page === "settings") {
    content = (
      <Settings
        nav={nav}
        user={user}
        subjects={subjects}
        setSubjects={setSubjects}
      />
    );
  }

  return (
    <div className={styles.appShell}>
      <div className={styles.titlebar}>
        <img src="./logo512dark.svg" alt="Flowstate" />
      </div>
      <div className={styles.pageContent}>
        {content}
      </div>
    </div>
  );
}
