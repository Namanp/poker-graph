# PokerGraph

Desktop-first poker tracking app for:
- Cash hand-history uploads (Ignition format)
- EV and net-profit graphs
- HUSNG profit tracking
- Home-game session tracking

Built with React + Express + SQLite, and runnable as an Electron app.

## Quick Start

If you just want to run and use it locally:

1. Install dependencies:
```bash
npm install
```
2. Start desktop app:
```bash
npm run electron:start
```
3. Open `+ Upload` and import your Ignition `.txt` files.
4. Open `Dashboard` to see cumulative profit/EV graphs.

## Requirements

- Node.js 20+ (recommended)
- npm 10+
- macOS (for `.dmg` packaging steps in this README)

## Install

```bash
npm install
```

## Run (Web Dev Mode)

Runs frontend + backend separately:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Run (Electron App from Source)

```bash
npm run electron:start
```

This builds the frontend and launches the Electron desktop app.

## Electron Dev Mode (hot frontend)

```bash
npm run electron:dev
```

Use this when iterating on UI quickly.

## Tests

```bash
npm test
```

## Package macOS App (`.dmg`)

```bash
npm run electron:package
```

If successful, output is created in:
- `release/PokerGraph-<version>-arm64.dmg` (Apple Silicon)

## Data Storage

### Web Dev Mode
- SQLite DB at: `data/poker.db`

### Electron Mode
- SQLite DB at:
  `~/Library/Application Support/PokerGraph/data/poker.db`

This means web-mode data and Electron-mode data are separate by default.

## App Overview

PokerGraph is a local desktop poker tracker focused on session-level bankroll visibility with optional all-in EV for cash hands.

Main capabilities:
- Import one or many Ignition hand history files at once
- Parse hand histories into a normalized internal format
- Evaluate cash hands for:
  - Net result per hand
  - EV-adjusted result in all-in situations (including side-pot handling)
- Store results in SQLite using unified `sessions` + `session_results` + `hands` tables
- Visualize cumulative graphs on the Dashboard:
  - Net profit graph
  - EV-adjusted graph (where applicable)
- Track HUSNG as profit-only sessions (no EV)
- Track home games with manual buy-in / cash-out entries
- View and delete uploaded sessions/home-game entries

Design approach:
- Parsing is isolated from evaluation logic
- Evaluators are reusable across parser sources
- Tests cover parser fixtures and evaluator behavior independently

## Import Workflow

1. Open app
2. Go to `+ Upload`
3. Drop or select one or multiple Ignition hand-history `.txt` files
4. Confirm upload
5. Review Dashboard graphs/tables

## Project Scripts

- `npm run dev`: web frontend + backend
- `npm run server`: backend only
- `npm run client`: frontend only
- `npm run build`: production frontend build
- `npm run electron:start`: build + run Electron
- `npm run electron:dev`: run Electron with Vite dev frontend
- `npm run electron:rebuild`: rebuild native deps for Electron ABI
- `npm run electron:package`: create macOS `.dmg`
- `npm test`: Node test suite (`server/test/*.test.js`)

## Troubleshooting

### 1) `better-sqlite3` ABI mismatch in Electron

Error example includes:
`was compiled against a different Node.js version`

Fix:

```bash
npm run electron:rebuild
```

If needed, reinstall dependencies first:

```bash
rm -rf node_modules package-lock.json
npm install
npm run electron:rebuild
```

### 2) Black screen on startup

Use source-run first:

```bash
npm run electron:start
```

If app works there but not in installed `.dmg`, rebuild/repackage:

```bash
npm run electron:package
```

### 3) Packaging fails at `hdiutil`

This is usually a local macOS disk/temporary-space issue.

Try:
- Free disk space
- Retry `npm run electron:package`
