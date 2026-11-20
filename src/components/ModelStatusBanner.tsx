import { useEffect, useState } from "react";
import styles from "./ModelStatusBanner.module.css";

type ModelStatus = {
  state: "checking" | "downloading" | "warming" | "ready" | "error" | "unavailable";
  percent: number | null;
  completedBytes: number | null;
  totalBytes: number | null;
  statusText: string;
  error: string | null;
};

type SidecarStatus = {
  state: "stopped" | "starting" | "ready" | "restarting" | "error";
  error: string | null;
  port: number | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function ModelStatusBanner() {
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [sidecar, setSidecar] = useState<SidecarStatus | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    let stopModel: () => void = () => undefined;
    let stopSidecar: () => void = () => undefined;
    api.getModelStatus().then(setModel).catch(() => undefined);
    api.getSidecarStatus().then(setSidecar).catch(() => undefined);
    stopModel = api.onModelProgress(setModel);
    stopSidecar = api.onSidecarStatus(setSidecar);
    return () => {
      stopModel();
      stopSidecar();
    };
  }, []);

  const showModel = model !== null && model.state !== "ready";
  const showSidecar = sidecar?.state === "error";
  if (!showModel && !showSidecar) return null;

  return (
    <div className={styles.wrap}>
      {showModel && model && (
        <section className={`${styles.card} ${model.state === "error" ? styles.error : ""}`}>
          <div className={styles.row}>
            <div>
              <div className={styles.title}>{modelTitle(model.state)}</div>
              <div className={styles.sub}>{model.error ?? model.statusText}</div>
              {model.completedBytes !== null && model.totalBytes !== null && model.totalBytes > 0 && (
                <div className={styles.sub}>
                  {formatBytes(model.completedBytes)} / {formatBytes(model.totalBytes)}
                </div>
              )}
            </div>
            {(model.state === "error" || model.state === "unavailable") && (
              <button className={styles.retry} onClick={() => void window.electronAPI.retryModelDownload().then(setModel)}>
                Retry
              </button>
            )}
          </div>
          {model.state === "downloading" && (
            <div
              className={styles.track}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={model.percent ?? 0}
            >
              <div className={styles.fill} style={{ width: `${model.percent ?? 0}%` }} />
            </div>
          )}
        </section>
      )}
      {showSidecar && sidecar && (
        <section className={`${styles.card} ${styles.error}`}>
          <div className={styles.row}>
            <div>
              <div className={styles.title}>Screen checks stopped</div>
              <div className={styles.sub}>
                {sidecar.error ?? "The capture service crashed. Keyword checks cannot run."}
              </div>
            </div>
            <button className={styles.retry} onClick={() => void window.electronAPI.retrySidecar().then(setSidecar)}>
              Retry
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function modelTitle(state: ModelStatus["state"]): string {
  if (state === "downloading") return "Downloading the focus model";
  if (state === "warming") return "Warming up the focus model";
  if (state === "checking") return "Checking the focus model";
  if (state === "error") return "Model download failed";
  return "Keyword fallback is running";
}
