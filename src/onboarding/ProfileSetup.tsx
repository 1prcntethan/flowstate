import { useRef, useState } from "react";
import styles from "./ProfileSetup.module.css";

const SUBJECTS = ["Math", "Science", "CS", "English", "History", "Languages", "Other"];

type Props = { onFinish: () => void };

export default function ProfileSetup({ onFinish }: Props) {
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggle = (s: string) =>
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    // TODO: upload to real storage once backend exists — this is a local preview only
  };

  // TODO: replace with a real uniqueness check against the users table
  const usernameStatus = username.trim().length >= 3 ? "available" : null;

  return (
    <div className="page">
      <div className={styles.container}>
        <h1 className={styles.title}>Set up your profile</h1>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handlePhotoChange}
        />
        <button className={styles.photoBtn} onClick={handlePhotoClick}>
          {photoPreview ? (
            <img src={photoPreview} className={styles.photoPreview} alt="" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
        <p className={styles.photoLabel}>Choose Photo</p>

        <div className={styles.usernameRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {usernameStatus && (
            <span className={styles.usernameStatus}>{usernameStatus}</span>
          )}
        </div>
        <p className={styles.helper}>Shown on the leaderboard</p>

        <p className={styles.label}>DEFAULT SUBJECTS</p>
        <div className={styles.chips}>
          {SUBJECTS.map((s) => (
            <button
              key={s}
              className={selected.includes(s) ? styles.chipActive : styles.chip}
              onClick={() => toggle(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <p className={styles.helper}>
          Pre-populates keywords in session setup. Editable later.
        </p>

        {/* TODO: persist photo, username, and selected subjects once DynamoDB is wired up */}
        <button className={styles.finishBtn} onClick={onFinish}>
          Go to dashboard →
        </button>
      </div>
    </div>
  );
}