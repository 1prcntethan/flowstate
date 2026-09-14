import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { User } from "../types";

type AuthContextValue = {
  user: User | null;
  authChecked: boolean;
  hasCompletedOnboarding: boolean;
  onboardingChecked: boolean;
  isCompletingSignup: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ userSub: string }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateCoins: (delta: number) => Promise<void>;
  updateSubjects: (update: React.SetStateAction<string[]>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_SUBJECTS = [
  "Math",
  "Science",
  "CS",
  "English",
  "History",
  "Language",
];

async function fetchUser(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const { profile } = await window.electronAPI.getUserProfile(normalized);
  return {
    id: normalized,
    name: profile?.username ?? normalized,
    coins: profile?.coins ?? 0,
    streak: profile?.streak ?? 0,
    subjects: profile?.subjects ?? DEFAULT_SUBJECTS,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await window.electronAPI.getSession();

      if (session) {
        setUser(await fetchUser(session.email));
        const completed = await window.electronAPI.getOnboardingCompleted(
          session.email,
        );
        setHasCompletedOnboarding(completed);
      }
      // logged out / fresh device: no userId to key by, so just always show
      // the full flow — simpler than a separate device-level bucket for now.

      setAuthChecked(true);
      setOnboardingChecked(true);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    await window.electronAPI.signIn(email, password);
    setUser(await fetchUser(email)); // real profile now, not a fake 0/0 placeholder
  };

  const signUp = (email: string, password: string) =>
    window.electronAPI.signUp(email, password);

  const confirmSignUp = async (email: string, code: string) => {
    await window.electronAPI.confirmSignUp(email, code);
    // handleVerify calls login() right after this, which flips `user` truthy —
    // this keeps App.tsx from bailing to Dashboard before ProfileSetup runs.
    setIsCompletingSignup(true);
  };

  const signOut = async () => {
    await window.electronAPI.signOut();
    setUser(null);
  };

  const completeOnboarding = async () => {
    if (!user) return;
    await window.electronAPI.setOnboardingCompleted(user.id);
    setHasCompletedOnboarding(true);
    setIsCompletingSignup(false);
  };

  const updateCoins = async (delta: number) => {
    if (!user) return;
    const previousCoins = user.coins;
    setUser((prev) => (prev ? { ...prev, coins: prev.coins + delta } : prev));

    const { ok } = await window.electronAPI.updateUserStats({
      userId: user.id,
      coinDelta: delta,
      newStreak: user.streak,
    });
    if (!ok) {
      setUser((prev) => (prev ? { ...prev, coins: previousCoins } : prev));
      console.error("Failed to sync coins");
    }
  };

  const updateSubjects = async (
    update: string[] | ((prev: string[]) => string[]),
  ) => {
    if (!user) return;
    const next = typeof update === "function" ? update(user.subjects) : update;
    setUser((prev) => (prev ? { ...prev, subjects: next } : prev)); // optimistic

    const { ok } = await window.electronAPI.updateUserSubjects({
      userId: user.id,
      subjects: next,
    });
    if (!ok) {
      setUser((prev) => (prev ? { ...prev, subjects: user.subjects } : prev)); // revert
      console.error("Failed to sync subjects");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authChecked,
        hasCompletedOnboarding,
        onboardingChecked,
        isCompletingSignup,
        login,
        signUp,
        confirmSignUp,
        signOut,
        completeOnboarding,
        updateCoins,
        updateSubjects,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
