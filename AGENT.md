# AGENT.md

This file gives coding agents the project context needed to work safely in this repository.

## Project Overview

Script Box is an Electron + Vue 3 desktop application for managing script Jobs and Task executions.

Core features:

- Auto-discover Job templates from `src/jobs`
- Import user Jobs from zip packages
- Install user Job dependencies from each Job's own `package.json`
- Create, edit, delete, run, and stop Tasks
- Persist Tasks and RunRecords in SQLite through `better-sqlite3`
- Write logs to the filesystem
- Stream live logs and task state changes to the renderer through IPC
- Package Windows installer and portable builds with electron-builder

## Tech Stack

- Electron
- Vue 3
- TypeScript
- Pinia
- Vuetify
- SQLite via `better-sqlite3`
- Electron Vite
- electron-builder

## Commands

Install dependencies:

```bash
npm install
```

Start development app:

```bash
npm run dev
```

Type-check and build Vite/Electron output:

```bash
npm run build
```

Package Windows installer and portable app:

```bash
npm run dist:win
```

Build output goes to `out/`.
Packaged artifacts go to `release/`.

## Important Directories

```text
src/main/       Electron main process: DB, IPC, Job, Task, Runner, Log
src/preload/    Safe renderer bridge APIs
src/renderer/   Vue renderer application
src/jobs/       Built-in Job templates
build/icons/    Generated app icons
docs/           Product requirements and design docs
```

## Runtime Data

Runtime data is stored under Electron `app.getPath('userData')`.

- SQLite database: `database/script-box.sqlite`
- Logs: `logs/`
- User Jobs: `jobs/`

Do not store runtime database or log files in the repository.

## Job Contract

Built-in Jobs live in `src/jobs`.

User-imported Jobs live in Electron `userData/jobs`.

Required files:

```text
src/jobs/example-job/
  manifest.js
  index.js
```

`manifest.js` exports Job metadata and dynamic form fields.

`index.js` exports:

```js
export default {
  manifest,

  async run(config, context) {
    context.logger.info('message')

    if (context.signal.aborted) {
      return
    }
  }
}
```

Jobs run in the Node/Electron runtime and may import dependencies from `node_modules`.

User Job zip packages must include:

```text
manifest.js
index.js
package.json
```

User Jobs should declare runtime dependencies in their own `package.json`.
After import, Script Box installs dependencies inside that Job directory.

## IPC Notes

Renderer APIs are exposed through `window.scriptBox` in `src/preload/index.ts`.

Main IPC handlers are registered in `src/main/ipc/register-ipc.ts`.

Important event channels:

- `log:event`
- `job:progress`
- `task:changed`
- `window:maximized`

When Runner state changes, emit `task:changed` so the renderer updates without manual refresh.

## UI Notes

The app uses a custom frameless Electron window.

- BrowserWindow uses `frame: false`
- The renderer header contains minimize, maximize/restore, and close controls
- The titlebar drag area uses `-webkit-app-region: drag`
- Interactive controls inside the header must use `-webkit-app-region: no-drag`

The main page should not scroll as a whole. The bottom task list area owns its own scrolling.

## Packaging Notes

The project uses local Electron runtime for packaging:

```json
"electronVersion": "35.7.5",
"electronDist": "node_modules/electron/dist"
```

This avoids download failures during `electron-builder` when network/proxy settings are unreliable.

Windows targets:

- `nsis`
- `portable`

## Git Hygiene

Do not commit:

- `node_modules/`
- `out/`
- `dist/`
- `release/`
- `*.tsbuildinfo`
- runtime `database/`
- runtime `logs/`

Before finishing substantive changes, run:

```bash
npm run build
```

Only skip build verification when the user explicitly asks not to run it.
