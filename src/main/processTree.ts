import { execFileSync } from "node:child_process";

export type KillStep =
  | { kind: "exec"; file: "taskkill"; args: string[] }
  | { kind: "signal"; pid: number; signal: "SIGTERM" | "SIGKILL" };

/** Kill only this pid's process tree. Never an image name or a global pattern. */
export function processTreeKillPlan(platform: NodeJS.Platform, pid: number): KillStep[] {
  if (!Number.isInteger(pid) || pid <= 0) return [];
  if (platform === "win32") {
    return [{ kind: "exec", file: "taskkill", args: ["/PID", String(pid), "/T", "/F"] }];
  }
  return [
    { kind: "signal", pid: -pid, signal: "SIGTERM" },
    { kind: "signal", pid: -pid, signal: "SIGKILL" },
  ];
}

export function planMentionsMachineWideKill(plan: readonly KillStep[]): boolean {
  const text = JSON.stringify(plan);
  return (
    text.includes("/IM") ||
    text.includes("pkill") ||
    text.includes("killall") ||
    text.includes("llama-server")
  );
}

export function killProcessTree(platform: NodeJS.Platform, pid: number): void {
  for (const step of processTreeKillPlan(platform, pid)) {
    if (step.kind === "exec") {
      try {
        execFileSync(step.file, step.args, { stdio: "ignore", windowsHide: true });
      } catch {
        // already exited
      }
      continue;
    }
    try {
      process.kill(step.pid, step.signal);
    } catch {
      // already exited, or the group was already gone after SIGTERM
    }
  }
}
