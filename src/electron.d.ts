declare interface Window {
  electronAPI: {
    classify: (payload: {
      subjects: string[];
      todos: { text: string }[];
    }) => Promise<{
      label: "on_task" | "off_task" | "ambiguous";
      confidence: number;
      reason: string;
      source: "ollama" | "fallback";
      fallbackStage: "domain" | "subject" | "todo" | "none" | null;
    }>;
    getModelStatus: () => Promise<{
      state: "checking" | "downloading" | "warming" | "ready" | "error" | "unavailable";
      percent: number | null;
      completedBytes: number | null;
      totalBytes: number | null;
      statusText: string;
      error: string | null;
    }>;
    retryModelDownload: () => Promise<{
      state: "checking" | "downloading" | "warming" | "ready" | "error" | "unavailable";
      percent: number | null;
      completedBytes: number | null;
      totalBytes: number | null;
      statusText: string;
      error: string | null;
    }>;
    onModelProgress: (
      callback: (status: {
        state: "checking" | "downloading" | "warming" | "ready" | "error" | "unavailable";
        percent: number | null;
        completedBytes: number | null;
        totalBytes: number | null;
        statusText: string;
        error: string | null;
      }) => void,
    ) => () => void;
    getSidecarStatus: () => Promise<{
      state: "stopped" | "starting" | "ready" | "restarting" | "error";
      error: string | null;
      port: number | null;
    }>;
    retrySidecar: () => Promise<{
      state: "stopped" | "starting" | "ready" | "restarting" | "error";
      error: string | null;
      port: number | null;
    }>;
    onSidecarStatus: (
      callback: (status: {
        state: "stopped" | "starting" | "ready" | "restarting" | "error";
        error: string | null;
        port: number | null;
      }) => void,
    ) => () => void;
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
