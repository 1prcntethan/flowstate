# Flowstate

Desktop study timer. Electron + React + TypeScript (Vite, Electron Forge). A Python sidecar captures the screen, runs OCR, and classifies each check. Ollama runs locally. Accounts use Cognito. Session stats are written to DynamoDB.

Screenshots and raw OCR text stay on the machine. Do not add code that stores, logs, or uploads them. Only labels and aggregate stats are sent to the backend.

## Setup

Install Node.js 22 (CI uses 22) and Python 3.12 (3.11 is also supported; do not use 3.14). CI reads `python/runtime.txt`.

```bash
npm install
```

Python dependencies for the sidecar:

```bash
pip install -r python/requirements.txt
```

The sidecar resolves Tesseract from `FLOWSTATE_RESOURCES_DIR/tesseract/` when that directory is present, and otherwise uses `tesseract` on `PATH`.

- Windows bundle: `tesseract/tesseract.exe` and `tesseract/tessdata/`
- macOS bundle: `tesseract/tesseract` and `tesseract/tessdata/`

`FLOWSTATE_TESSERACT_CMD` can point at a binary directly. No user-specific path is hardcoded. The Tesseract binaries themselves are not in git; dev machines use a system install. Electron generates a per-launch sidecar token in the main process and does not send it to the renderer. Dev launches Python 3.12 or 3.11 from `PATH` (`py -3.12` / `py -3.11` / `python` on Windows, `python3.12` / `python3.11` / `python3` on macOS and Linux). `FLOWSTATE_PYTHON` can point at a specific interpreter. A packaged build uses `resources/sidecar/flowstate-sidecar` when that PyInstaller binary exists.

For a dev build, place the Ollama binary at `resources/ollama/win/ollama.exe` or `resources/ollama/mac/ollama`. That directory is gitignored, including model weights. If it is missing in dev, Electron runs `ollama` from `PATH`. A packaged app looks under `process.resourcesPath/ollama` and does not fall back to a system install. `npm run package` copies `resources/ollama` only when that directory exists, so CI still packages without it.

Electron picks a free `127.0.0.1` port, starts only that Ollama process with `OLLAMA_HOST`, and on quit kills that process tree. It does not kill other Ollama processes on the machine. The first run downloads the model (`llama3.2:1b` unless `FLOWSTATE_OLLAMA_MODEL` is set) with Ollama's streaming pull, which resumes a partial download, and shows progress in the app. Checks keep using keyword fallback until the model is warm.

## Env

Create a `.env` in the repo root (it is gitignored). The app reads it from the main process via `dotenv`.

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Do not commit that file. The Cognito user-pool id and app client id currently live in `src/main/auth.ts`. They are public client identifiers, not secret keys.

## Scripts

```bash
npm start            # Electron Forge + Vite dev server (DevTools open)
npm test             # Vitest, one run
npm run lint
npm run typecheck    # tsc --noEmit (strict)
npm run package      # Forge package
npm run make         # Forge installers
python -m unittest discover -s python -p "test_*.py" -v
```

Packaged builds do not open DevTools. `npm start` does, because Forge sets the Vite dev-server URL.

## CI

`.github/workflows/ci.yml` runs on every push and pull request.

- Ubuntu: `npm run lint`, `npm run typecheck`, `npm test`
- Ubuntu: Python 3.12 `unittest` for the sidecar (`python -m unittest discover -s python -p "test_*.py" -v`)
- Vitest also covers sidecar ready-line parsing, bearer auth, one crash restart, and Ollama pull progress
- Windows and macOS: `npm run package`

The package job does not need `resources/ollama` or a `.env` file. `npm run lint` exits 0 with the current warnings; it fails on errors.

## Scoring

A recorded check weighs on-task 1, ambiguous 0.5, or off-task 0. Focus percent is that weighted share, then the existing square-root curve. Coins come from the curved score and the session clock. There is no break coin penalty. `INCOMPLETE_TODO_COIN_PENALTY` stays 0 until that penalty is decided.

Allotted break time records no checks, so it is not in the focus denominator. Break overtime inserts an ambiguous check each capture interval. The session clock keeps running during a break and the session ends at zero, including mid-break. Coins are then calculated from the score as usual. Zero recorded checks is no data: no score, no coins, and no streak change.

## Architecture

The renderer is React. `App.tsx` switches pages with `useState` (no router). The renderer talks to the main process only through `src/preload.ts` → `window.electronAPI`. Channel types are in `src/electron.d.ts`.

`src/main.ts` is the process entry. It starts the window, the Python sidecar, and Ollama, and it stops those child processes on quit. IPC handlers are registered in `src/main/ipc.ts` and call:

| Module | Role |
| --- | --- |
| `src/main/windows.ts` | BrowserWindow, mini/expand, DevTools in dev only |
| `src/main/sidecar.ts` | Spawn Python 3.12/3.11 or the packaged sidecar, read the ready line, health-check with the bearer token, restart once |
| `src/main/ollama.ts` | One Ollama child on its own `127.0.0.1` port, model pull progress, kill that pid only |
| `src/main/tracker.ts` | Idle time and `POST http://127.0.0.1:<port>/classify` with the bearer token |
| `src/main/auth.ts` | Cognito sign-up/in/out and OS-encrypted tokens |
| `src/main/apiClient.ts` | DynamoDB reads and writes (`flowstate-users`, `flowstate-sessions`) |
| `src/main/store.ts` | `electron-store` (onboarding flag) |

Python (`python/server.py`, `python/classifier.py`) is capture → OCR → classify. Nothing else. It does not read the active window. Screenshots stay in memory and are closed after OCR.

Electron starts the sidecar itself. To run it by hand:

```bash
FLOWSTATE_SIDECAR_TOKEN=dev OLLAMA_HOST=127.0.0.1:11434 python3 python/server.py
```

Stdout is one JSON object per line. The ready line is `{"event":"ready","host":"127.0.0.1","port":<port>}`. Every request, including `GET /health` and `POST /classify`, needs `Authorization: Bearer <FLOWSTATE_SIDECAR_TOKEN>`. A missing token refuses to start. `FLOWSTATE_SIDECAR_PORT` can pin a port; otherwise the OS picks a free one. Ollama is read per check from `FLOWSTATE_OLLAMA_URL` or `OLLAMA_HOST`. Electron sets `OLLAMA_HOST` to the child it spawned.

`POST /classify` body is `{"subjects":["..."],"todos":[{"text":"..."}]}`. The response keeps `label`, `confidence`, and `reason`, and adds `source` (`ollama` or `fallback`) and `fallbackStage` (`null`, `domain`, `subject`, `todo`, or `none`). `reason` is a short fixed string, not screen text and not the model reply.

Tests in `tests/` cover scoring math, break overtime (including the session clock expiring during a break), local-day streaks, todo validation, sidecar lifecycle, and Ollama pull progress. `python/test_*.py` covers classifier fallback order, the untrusted OCR prompt, multi-monitor capture, Tesseract paths, and token auth.

Packaging stays on Electron Forge (`forge.config.ts`). This phase does not switch to electron-builder.

## Not in this phase

Left for later, on purpose:

- Server-side coins and streaks. The client scores a session locally and does not change coins or streak when no checks were recorded. Persisting streak from local days belongs in the API, not in this app.
- Direct DynamoDB access with static IAM keys from `.env`. The client sends user id, coins, and streak. A later phase should move that behind API Gateway + Lambda and a Cognito authorizer.
- Bundled Python (`python/dist` via PyInstaller), signed/notarized installers, and making sure `.env` cannot be packed into the app
- Privacy-policy link, delete-account, and crash reporting that cannot include screen content
