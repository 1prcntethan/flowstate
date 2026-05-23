import { useState } from "react";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import PreSession from "./pages/PreSession";
import ActiveSession from "./pages/ActiveSession";
import { SessionConfig } from "./types";
// import SessionEnd from './pages/SessionEnd'

export type Page = "dashboard" | "presession" | "session" | "sessionend";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
    null,
  );

  const nav = (p: Page) => setPage(p);

  if (page === "dashboard") return <Dashboard nav={nav} />;
  if (page === "presession")
    return <PreSession nav={nav} onStart={setSessionConfig} />;
  if (page === "session")
    return <ActiveSession nav={nav} config={sessionConfig!} />;
  // if (page === 'sessionend')  return <SessionEnd  nav={nav} />
}
