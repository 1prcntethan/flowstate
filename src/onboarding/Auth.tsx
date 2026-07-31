import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import styles from "./Auth.module.css";

type Mode = "login" | "signup-details" | "signup-verify";

type Props = {
  onExistingAccount: () => void;
  onNewAccount: () => void;
};

export default function Auth({ onExistingAccount, onNewAccount }: Props) {
  const { login, signUp, confirmSignUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () =>
    run(async () => {
      await login(email, password);
      onExistingAccount();
    });
  const handleSignUp = () =>
    run(async () => {
      await signUp(email, password);
      setMode("signup-verify");
    });
  const handleVerify = () =>
    run(async () => {
      await confirmSignUp(email, code);
      await login(email, password); // Cognito requires a real sign-in after confirmation
      onNewAccount();
    });

  const isSignup = mode === "signup-details";

  return (
    <div className="page">
      <div className={styles.container}>
        <h1 className={styles.title}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className={styles.subtitle}>
          {mode === "login"
            ? "Sign in to sync your points and streaks."
            : "Sync points, add friends, and track points across devices."}
        </p>

        {mode !== "signup-verify" && (
          <>
            <button
              className={styles.googleBtn}
              disabled
              title="Coming soon"
            >
              Continue with Google
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <input
              className={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {mode === "signup-verify" && (
          <>
            <p className={styles.helper}>Enter the code sent to {email}</p>
            <input
              className={styles.input}
              type="text"
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.primaryBtn}
          disabled={loading}
          onClick={
            mode === "login"
              ? handleLogin
              : isSignup
                ? handleSignUp
                : handleVerify
          }
        >
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : isSignup
                ? "Continue with email →"
                : "Verify"}
        </button>

        {mode === "login" && (
          <button
            className={styles.linkBtn}
            onClick={() => { setMode("signup-details"); setError(""); }}
          >
            Don't have an account? Sign up
          </button>
        )}
        {isSignup && (
          <button
            className={styles.linkBtn}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}