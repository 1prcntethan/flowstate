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
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ userSub: string }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateCoins: (delta: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    window.electronAPI.getSession().then((session) => {
      if (session)
        setUser({
          id: session.email,
          name: session.email,
          coins: 0,
          streak: 0,
        });
      setAuthChecked(true);
    });
    window.electronAPI.getOnboardingCompleted().then((completed) => {
      setHasCompletedOnboarding(completed);
      setOnboardingChecked(true);
    });
  }, []);

  const login = async (email: string, password: string) => {
    await window.electronAPI.signIn(email, password);
    setUser({ id: email, name: email, coins: 0, streak: 0 }); // ← updates React immediately
  };

  const signUp = (email: string, password: string) =>
    window.electronAPI.signUp(email, password);

  const confirmSignUp = async (email: string, code: string) => {
    await window.electronAPI.confirmSignUp(email, code);
  };

  const signOut = async () => {
    await window.electronAPI.signOut();
    setUser(null);
  };

  const completeOnboarding = async () => {
    await window.electronAPI.setOnboardingCompleted();
    setHasCompletedOnboarding(true);
  };

  const updateCoins = async (delta: number) => {
    if (!user) return;
    const previousCoins = user.coins;

    setUser((prev) => (prev ? { ...prev, coins: prev.coins + delta } : prev));

    try {
      await window.electronAPI.updateUserStats({
        userId: user.id,
        coinDelta: delta,
        newStreak: user.streak,
      });
    } catch (err) {
      setUser((prev) => (prev ? { ...prev, coins: previousCoins } : prev));
      console.error("Failed to sync coins:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authChecked,
        hasCompletedOnboarding,
        onboardingChecked,
        login,
        signUp,
        confirmSignUp,
        signOut,
        completeOnboarding,
        updateCoins,
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
