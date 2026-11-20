import { powerMonitor } from "electron";

export function getSystemIdleTime() {
  return powerMonitor.getSystemIdleTime(); // seconds since last input
}

export async function classifySession(payload: {
  subjects: string[];
  todos: { text: string }[];
}) {
  try {
    const res = await fetch("http://localhost:5001/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    console.log("classification failed");
    return {
      label: "ambiguous",
      confidence: 0.5,
      reason: "python unreachable",
    };
  }
}
