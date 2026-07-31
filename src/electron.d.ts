declare interface Window {
  electronAPI: {
    classify: (payload: {
      subjects: string[];
      todos: { text: string }[];
    }) => Promise<{
      label: "on_task" | "off_task" | "ambiguous";
      confidence: number;
      reason: string;
    }>;
    setMiniMode: () => Promise<void>;
    setExpandMode: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<{ userSub: string }>;
    confirmSignUp: (email: string, code: string) => Promise<any>;
    signIn: (email: string, password: string) => Promise<{ email: string }>;
    getSession: () => Promise<{ email: string; hasSession: boolean } | null>;
    signOut: () => Promise<void>;
    getOnboardingCompleted: () => Promise<boolean>;
    setOnboardingCompleted: () => Promise<void>;
    getPlatform: () => Promise<NodeJS.Platform>;
    checkScreenAccess: () => Promise<
      "granted" | "denied" | "not-determined" | "restricted" | "unknown"
    >;
    openScreenSettings: () => Promise<void>;
  };
}
