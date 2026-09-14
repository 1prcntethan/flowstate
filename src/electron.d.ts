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
    getOnboardingCompleted: (userId: string) => Promise<boolean>;
    setOnboardingCompleted: (userId: string) => Promise<void>;
    getPlatform: () => Promise<NodeJS.Platform>;
    checkScreenAccess: () => Promise<
      "granted" | "denied" | "not-determined" | "restricted" | "unknown"
    >;
    openScreenSettings: () => Promise<void>;
    getUserProfile: (
      userId: string,
    ) => Promise<{ ok: boolean; profile: any | null; error?: string }>;
    createUserProfile: (
      profile: any,
    ) => Promise<{ ok: boolean; error?: string }>;
    updateUserStats: (payload: any) => Promise<{ ok: boolean; error?: string }>;
    saveSession: (payload: any) => Promise<{ ok: boolean; error?: string }>;
    getRecentSessions: (
      userId: string,
      length: number,
    ) => Promise<{ ok: boolean; sessions: any[]; error?: string }>;
    getTodaySessions: (
      userId: string,
    ) => Promise<{ ok: boolean; sessions: any[]; error?: string }>;
    updateUserSubjects: (payload: any) => Promise<{ ok: boolean; error?: string }>;
    getIdleTime: () => Promise<number>;
    isAiReady: () => Promise<boolean>;
    warmUpAI: () => Promise<boolean>;
  };
}
