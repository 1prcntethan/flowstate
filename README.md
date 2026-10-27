# Flowstate

Desktop study timer. Electron + React + TypeScript (Vite, Electron Forge). A Python sidecar captures the screen, runs OCR, and classifies each check. Ollama runs locally. Accounts use Cognito. Session stats are written to DynamoDB.

Screenshots and raw OCR text stay on the machine. Do not add code that stores, logs, or uploads them. Only labels and aggregate stats are sent to the backend.

## Setup

Install Node.js (the version you use for Electron 42) and Python.

```bash
npm install
```

Python dependencies for the sidecar:

```bash
pip install -r python/requirements.txt
```

The main process still launches a machine-specific interpreter and Tesseract. That is unchanged in this phase:

- Windows: `%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe` and `%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe`
- macOS: `/Library/Frameworks/Python.framework/Versions/3.11/bin/python3`, with `tesseract` on `PATH`

For a dev build, place the Ollama binary at `resources/ollama/win/ollama.exe` or `resources/ollama/mac/ollama`. That directory is gitignored, including model weights.

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
npm run typecheck    # tsc --noEmit
npm run package      # Forge package
npm run make         # Forge installers
```

Packaged builds do not open DevTools. `npm start` does, because Forge sets the Vite dev-server URL.

## Architecture

The renderer is React. `App.tsx` switches pages with `useState` (no router). The renderer talks to the main process only through `src/preload.ts` → `window.electronAPI`. Channel types are in `src/electron.d.ts`.

`src/main.ts` is the process entry. It starts the window, the Python sidecar, and Ollama, and it stops those child processes on quit. IPC handlers are registered in `src/main/ipc.ts` and call:

| Module | Role |
| --- | --- |
| `src/main/windows.ts` | BrowserWindow, mini/expand, DevTools in dev only |
| `src/main/sidecar.ts` | Python process spawn and kill |
| `src/main/ollama.ts` | Ollama spawn, ready check, warmup, kill |
| `src/main/tracker.ts` | Idle time and `POST http://localhost:5001/classify` |
| `src/main/auth.ts` | Cognito sign-up/in/out and OS-encrypted tokens |
| `src/main/apiClient.ts` | DynamoDB reads and writes (`flowstate-users`, `flowstate-sessions`) |
| `src/main/store.ts` | `electron-store` (onboarding flag) |

Python (`python/server.py`, `python/classifier.py`) is capture → OCR → classify. Nothing else.

Packaging stays on Electron Forge (`forge.config.ts`). This phase does not switch to electron-builder.

## Not in this phase

Left for later, on purpose:

- Hardcoded Python and Tesseract paths, fixed Flask port `5001` with no request token, and capture of `monitors[1]` only
- Ollama on port `11434`, and quit killing every `ollama.exe` / `llama-server` rather than the child this app spawned
- Scoring bugs (elapsed time stuck in the tracking loop, an empty session scored as 100%, streaks never calculated). Coin multipliers stay as they are until scoring work is approved. Break-overtime behavior is unchanged here.
- Direct DynamoDB access with static IAM keys from `.env`. The client sends user id, coins, and streak. A later phase should move that behind API Gateway + Lambda and a Cognito authorizer.
- Bundled Python (`python/dist` via PyInstaller), signed/notarized installers, and making sure `.env` cannot be packed into the app
- Privacy-policy link, delete-account, and crash reporting that cannot include screen content
