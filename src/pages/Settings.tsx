import { useState } from "react";
import type { Page } from "../App";
import type { User } from "../types";
import styles from "./Settings.module.css";

type Props = {
  nav: (p: Page) => void;
  user: User;
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
};

type BreakStyle = "pomodoro" | "manual";
type ThemeMode = "light" | "dark" | "system";

const NAV_SECTIONS = [
  "Profile",
  "Subjects",
  // "Tracking",
  // "Notifications",
  // "App",
  "Data & Privacy",
] as const;

const DEFAULT_APPS = ["Spotify", "Apple Music", "Finder"];

export default function Settings({ nav, user, subjects, setSubjects }: Props) {
  const [activeSection, setActiveSection] = useState<string>("Profile");
  const [showCollectModal, setShowCollectModal] = useState(false);

  const [studyApps, setStudyApps] = useState<string[]>(DEFAULT_APPS);
  const [breakStyle, setBreakStyle] = useState<BreakStyle>("pomodoro");

  const [notifLeaderboard, setNotifLeaderboard] = useState(true);
  const [notifFriendRequests, setNotifFriendRequests] = useState(true);
  const [notifStreak, setNotifStreak] = useState(true);
  const [notifRemind, setNotifRemind] = useState(false);

  const [launchAtLogin, setLaunchAtLogin] = useState(true);
  const [defaultMinimode, setDefaultMinimode] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const [showSubjectInput, setShowSubjectInput] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");

  const removeSubject = (s: string) =>
    setSubjects((prev) => prev.filter((x) => x !== s));

  const removeApp = (a: string) =>
    setStudyApps((prev) => prev.filter((x) => x !== a));

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addSubject = () => {
    const trimmed = subjectInput.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    setSubjects((prev) => [...prev, trimmed]);
    setSubjectInput("");
    setShowSubjectInput(false);
  };

  return (
  <div className={`page ${styles.settingsPage}`}>
      {/* ── Left sidebar ── */}
      {/* <div className={styles.sidebar}>
        <button className={styles.backBtn} onClick={() => nav("dashboard")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>
        <nav className={styles.sideNav}>
          {NAV_SECTIONS.map((s) => (
            <button
              key={s}
              className={styles.navItem}
              onClick={() => scrollTo(s)}
            >
              <span
                className={`${styles.navDot} ${activeSection === s ? styles.navDotActive : ""}`}
              />
              {s}
            </button>
          ))}
        </nav>
        <button className={styles.signOutBtn} onClick={() => nav("dashboard")}>
          Sign out
        </button>
      </div> */}
      <div className={styles.headerSection}>
        <button className={styles.backButton} onClick={() => nav("dashboard")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Dashboard</span>
        </button>
        <span className={styles.title}>Settings</span>
      </div>
      {/* ── Right content ── */}
      <div className={styles.content}>

        {/* PROFILE */}
        <section id="section-Profile" className={styles.section}>
          <span className={styles.sectionTitle}>PROFILE</span>
          <div className={styles.profileRow}>
            <button className={styles.avatarBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
            <div className={styles.profileInfo}>
              <span className={styles.username}>{user.name}</span>
              <span className={styles.email}>email@example.com</span>
              <button className={styles.linkBtn}>Edit username</button>
            </div>
          </div>
        </section>

        {/* STUDY SUBJECTS */}
        <section id="section-Subjects" className={styles.section}>
          <span className={styles.sectionTitle}>STUDY SUBJECTS</span>
          <div className={styles.chips}>
            {subjects.map((s) => (
              <button
                key={s}
                className={styles.chip}
                onClick={() => removeSubject(s)}
                title="Click to remove"
              >
                <span className={styles.chipLabel}>{s}</span>
                <span className={styles.chipX}>×</span>
              </button>
            ))}
            <button
              className={styles.chipAdd}
              onClick={() => setShowSubjectInput((v) => !v)}
            >
              + Add
            </button>
          </div>
          {showSubjectInput && (
            <div className={styles.subjectInput}>
              <input
                autoFocus
                type="text"
                placeholder="Subject name..."
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
              />
              <button onClick={addSubject}>Add</button>
            </div>
          )}
        </section>

        {/* TRACKING
        <section id="section-Tracking" className={styles.section}>
          <span className={styles.sectionTitle}>TRACKING</span>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Default break style</span>
            <div className={styles.segmented}>
              <button
                className={`${styles.segment} ${breakStyle === "pomodoro" ? styles.segmentActive : ""}`}
                onClick={() => setBreakStyle("pomodoro")}
              >
                Pomodoro
              </button>
              <button
                className={`${styles.segment} ${breakStyle === "manual" ? styles.segmentActive : ""}`}
                onClick={() => setBreakStyle("manual")}
              >
                Manual
              </button>
            </div>
          </div>

          <div className={styles.subRow}>
            <span className={styles.rowLabel}>Study buddy apps</span>
          </div>
          <div className={styles.chips}>
            {studyApps.map((a) => (
              <button
                key={a}
                className={styles.chip}
                onClick={() => removeApp(a)}
              >
                {a}
              </button>
            ))}
            <button className={styles.chipAdd}>+ Add App</button>
          </div>
          <span className={styles.helperText}>
            These apps are never counted as off task
          </span>
        </section> */}

        {/* NOTIFICATIONS
        <section id="section-Notifications" className={styles.section}>
          <span className={styles.sectionTitle}>NOTIFICATIONS</span>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Leaderboard rank changes</span>
            <ToggleSwitch
              checked={notifLeaderboard}
              onChange={setNotifLeaderboard}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Friend requests</span>
            <ToggleSwitch
              checked={notifFriendRequests}
              onChange={setNotifFriendRequests}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Streak reminders</span>
            <ToggleSwitch checked={notifStreak} onChange={setNotifStreak} />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Remind me at</span>
            <ToggleSwitch checked={notifRemind} onChange={setNotifRemind} />
          </div>
        </section> */}

        {/* APP
        <section id="section-App" className={styles.section}>
          <span className={styles.sectionTitle}>APP</span>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Launch at login</span>
            <ToggleSwitch checked={launchAtLogin} onChange={setLaunchAtLogin} />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Default minimode</span>
            <ToggleSwitch
              checked={defaultMinimode}
              onChange={setDefaultMinimode}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Theme</span>
            <div className={styles.segmented}>
              <button
                className={`${styles.segment} ${themeMode === "light" ? styles.segmentActive : ""}`}
                onClick={() => setThemeMode("light")}
              >
                Light
              </button>
              <button
                className={`${styles.segment} ${themeMode === "dark" ? styles.segmentActive : ""}`}
                onClick={() => setThemeMode("dark")}
              >
                Dark
              </button>
              <button
                className={`${styles.segment} ${themeMode === "system" ? styles.segmentActive : ""}`}
                onClick={() => setThemeMode("system")}
              >
                System
              </button>
            </div>
          </div>
        </section> */}

        {/* DATA & PRIVACY */}
        <section id="section-History" className={styles.section}>
          <span className={styles.sectionTitle}>DATA &amp; PRIVACY</span>

          <button className={styles.textLink} onClick={() => setShowCollectModal(true)}>What we collect</button>

          {/* <button className={styles.actionRow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Export session data to CSV
          </button> */}

          <button className={`${styles.actionRow} ${styles.actionAmber}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete session history
          </button>

          <button className={`${styles.actionRow} ${styles.actionRed}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Account
          </button>
        </section>

        <div style={{ height: 40 }} />
      </div>

      {/* ── What We Collect modal ── */}
      {showCollectModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCollectModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowCollectModal(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className={styles.modalTitle}>What we collect</h2>

            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionHead}>Stored locally on your computer</h3>
              <p className={styles.modalText}>
                <strong>Screenshots</strong> — screenshots taken during study sessions are saved only on your device. 
                They are never uploaded, transmitted, or accessible by anyone else.
              </p>
              <p className={styles.modalText}>
                <strong>Session details</strong> — information about what you were doing during a session 
                (e.g. the specific YouTube video you watched, websites visited, or apps used) stays on your machine. 
                We don&rsquo;t collect or store this data on our servers.
              </p>
            </section>

            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionHead}>Stored in our database</h3>
              <p className={styles.modalText}>
                <strong>Quantitative data only</strong> — we record high-level metrics like total focus time, 
                focus percentage, and whether you were on-task or off-task during a given interval. 
                No personal content, no URLs, and no app details.
              </p>
            </section>

            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionHead}>What this means for you</h3>
              <p className={styles.modalText}>
                You have full privacy over your study activity. Your screenshots and browsing context 
                never leave your computer. The only data we ever see are the numbers that help you 
                track your productivity over time.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.slider} />
    </label>
  );
}
