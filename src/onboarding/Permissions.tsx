import { useEffect, useState } from "react";
import styles from "./Permissions.module.css";

type AccessStatus = "granted" | "denied" | "not-determined" | "restricted" | "unknown";

type Props = { onNext: () => void };

const STEPS = [
  'Click "Open System Settings" below',
  "Navigate to Privacy & Security",
  "Tap Screen Recording",
  "Toggle on Flowstate",
];

export default function Permissions({ onNext }: Props) {
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<AccessStatus>("not-determined");
  const [showNotGranted, setShowNotGranted] = useState(false);

  useEffect(() => {
    window.electronAPI.checkScreenAccess().then((s) => {
      setStatus(s);
      setChecking(false);
      if (s === "granted") onNext(); // already granted — skip straight through
    });
  }, []);

  const handleOpenSettings = () => {
    window.electronAPI.openScreenSettings();
  };

  const handleCheckAgain = async () => {
    const s = await window.electronAPI.checkScreenAccess();
    setStatus(s);
    if (s === "granted") {
      onNext();
    } else {
      setShowNotGranted(true);
    }
  };

  if (checking) return null;

  return (
    <div className="page">
      <div className={styles.container}>
        <div className={styles.iconBox} />
        <h1 className={styles.title}>Enable screen access</h1>
        <p className={styles.subtitle}>
          Flowstate reads your screen locally to score your focus — nothing
          is uploaded or saved as an image.
        </p>

        <div className={styles.stepsCard}>
          {STEPS.map((s, i) => (
            <div className={styles.stepRow} key={s}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.stepText}>{s}</span>
            </div>
          ))}
        </div>

        <div className={styles.previewCard}>
          <span className={styles.previewLabel}>System Settings preview</span>
          <div className={styles.previewRow}>
            <div className={styles.previewIcon} />
            <span className={styles.previewName}>Flowstate</span>
            <span className={styles.previewToggle} />
          </div>
        </div>

        {showNotGranted && (
          <p className={styles.notGranted}>
            Permission not detected yet — enable it in System Settings, then try again.
          </p>
        )}

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleOpenSettings}>
            Open System Settings →
          </button>
          <button className={styles.secondaryBtn} onClick={handleCheckAgain}>
            I've enabled it →
          </button>
        </div>
      </div>
    </div>
  );
}