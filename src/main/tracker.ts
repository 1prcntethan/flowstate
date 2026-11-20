import { powerMonitor } from "electron";
import { getSidecarEndpoint } from "./sidecar";
import {
  classifyRequest,
  normalizeClassifyResult,
  unreachableClassify,
  type ClassifyResult,
} from "./sidecarLifecycle";

export function getSystemIdleTime() {
  return powerMonitor.getSystemIdleTime();
}

export async function classifySession(payload: {
  subjects: string[];
  todos: { text: string }[];
}): Promise<ClassifyResult> {
  const endpoint = getSidecarEndpoint();
  if (!endpoint) return unreachableClassify();
  const request = classifyRequest(endpoint.port, endpoint.token, payload);
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    if (!response.ok) return unreachableClassify();
    return normalizeClassifyResult(await response.json());
  } catch {
    console.log(JSON.stringify({ event: "classification_failed" }));
    return unreachableClassify();
  }
}
