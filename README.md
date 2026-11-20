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

`FLOWSTATE_TESSERACT_CMD` can point at a binary directly. No user-specific path is hardcoded. The Tesseract binaries themselves are not in git; dev machines use a system install. Electron still launches a machine-specific Python until the next step wires the sidecar.

For a dev build, place the Ollama binary at `resources/ollama/win/ollama.exe` or `resources/ollama/mac/ollama`. That directory is gitignored, including model weights. `npm run package` copies `resources/ollama` only when that directory exists, so CI and a machine without the binary still package. The packaged app has no Ollama until the directory is present.

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
| `src/main/sidecar.ts` | Python process spawn and kill |
| `src/main/ollama.ts` | Ollama spawn, ready check, warmup, kill |
| `src/main/tracker.ts` | Idle time. Still posts to `http://localhost:5001/classify` until the next step reads the sidecar port and token |
| `src/main/auth.ts` | Cognito sign-up/in/out and OS-encrypted tokens |
| `src/main/apiClient.ts` | DynamoDB reads and writes (`flowstate-users`, `flowstate-sessions`) |
| `src/main/store.ts` | `electron-store` (onboarding flag) |

Python (`python/server.py`, `python/classifier.py`) is capture → OCR → classify. Nothing else. It does not read the active window. Screenshots stay in memory and are closed after OCR.

Run the sidecar directly:

```bash
FLOWSTATE_SIDECAR_TOKEN=dev python python/server.py
```

Stdout is one JSON object per line. The ready line is `{"event":"ready","host":"127.0.0.1","port":<port>}`. Every request, including `GET /health` and `POST /classify`, needs `Authorization: Bearer <FLOWSTATE_SIDECAR_TOKEN>`. A missing token refuses to start. `FLOWSTATE_SIDECAR_PORT` can pin a port; otherwise the OS picks a free one. Ollama is read per check from `FLOWSTATE_OLLAMA_URL` or `OLLAMA_HOST` (default `127.0.0.1:11434`).

`POST /classify` body is `{"subjects":["..."],"todos":[{"text":"..."}]}`. The response keeps `label`, `confidence`, and `reason`, and adds `source` (`ollama` or `fallback`) and `fallbackStage` (`null`, `domain`, `subject`, `todo`, or `none`). `reason` is a short fixed string, not screen text and not the model reply.

Tests in `tests/` cover scoring math, break overtime (including the session clock expiring during a break), local-day streaks, and todo validation. `python/test_*.py` covers classifier fallback order, the untrusted OCR prompt, multi-monitor capture, Tesseract paths, and token auth.

Packaging stays on Electron Forge (`forge.config.ts`). This phase does not switch to electron-builder.

## Not in this phase

Left for later, on purpose:

- Electron still spawns a machine-specific Python, still posts to `http://localhost:5001/classify` with no token, and still does not read the sidecar ready line. The sidecar itself is already token-protected on `127.0.0.1`
- Ollama on port `11434` inside Electron, and quit killing every `ollama.exe` / `llama-server` rather than the child this app spawned. The sidecar already honors `OLLAMA_HOST` when that process is given the variable
- Server-side coins and streaks. The client scores a session locally and does not change coins or streak when no checks were recorded. Persisting streak from local days belongs in the API, not in this app.
- Direct DynamoDB access with static IAM keys from `.env`. The client sends user id, coins, and streak. A later phase should move that behind API Gateway + Lambda and a Cognito authorizer.
- Bundled Python (`python/dist` via PyInstaller), signed/notarized installers, and making sure `.env` cannot be packed into the app
- Privacy-policy link, delete-account, and crash reporting that cannot include screen content
