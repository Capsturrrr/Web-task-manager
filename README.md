# Smart Task Manager

[![ci](https://github.com/Capsturrrr/Web-task-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Capsturrrr/Web-task-manager/actions/workflows/ci.yml)

A minimal, offline-first task manager. Built with TypeScript and Vite, no framework, and about 10 KB of JavaScript once compressed.

## Features

- **Tasks:** add with a priority and optional due date, complete, edit inline, delete
- **Undo:** deleting, clearing completed and importing can all be undone, from the toast or with <kbd>Ctrl</kbd>+<kbd>Z</kbd>
- **Find:** filter (all, pending, completed, high priority), search as you type, sort by due date, priority or newest
- **Reorder:** drag with a mouse, finger or pen, or with the keyboard (focus a task's handle and press <kbd>↑</kbd> <kbd>↓</kbd>)
- **Overdue** tasks are flagged in red
- **Backup:** export to a JSON file and import it on another device; importing the same file twice adds nothing twice
- **Offline app:** installable from the browser, and works with no connection after the first visit
- **Dark mode:** follows the system setting, or pick light or dark yourself
- **Accessible:** fully usable by keyboard and screen reader; checked against WCAG 2.1 AA by automated tests in both themes
- **Private:** everything stays in your browser. No account, no server, no tracking

### Keyboard shortcuts

| Key                                              | Action                                |
| ------------------------------------------------ | ------------------------------------- |
| <kbd>/</kbd>                                     | Search                                |
| <kbd>n</kbd>                                     | New task                              |
| <kbd>Enter</kbd> / <kbd>Esc</kbd>                | Save / cancel an edit                 |
| <kbd>↑</kbd> <kbd>↓</kbd> on a handle            | Move a task                           |
| <kbd>←</kbd> <kbd>→</kbd> in the priority picker | Change priority                       |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd>                     | Undo the last delete, clear or import |

## Getting started

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command            | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | Development server with hot reload                               |
| `npm run build`    | Type-check, then build to `dist/` (including the service worker) |
| `npm run preview`  | Serve the production build locally                               |
| `npm test`         | Unit tests (Vitest)                                              |
| `npm run test:e2e` | Browser tests (Playwright) on desktop and mobile viewports       |
| `npm run check`    | Types, lint, formatting and unit tests in one go                 |
| `npm run format`   | Format everything with Prettier                                  |

The first time you run browser tests, install Chromium with `npx playwright install chromium`.

## How it's built

```
src/
  main.ts       wires state to the page: events, shortcuts, undo, theme, offline
  view.ts       renders tasks and stats to the DOM (text only, never HTML from data)
  tasks.ts      every change to the list, as pure functions
  query.ts      filtering, search and sorting
  storage.ts    localStorage with a schema version and migration from v1
  schema.ts     validates data from storage and imported files
  backup.ts     JSON export and import
  dragdrop.ts   pointer-based drag and drop (mouse, touch, pen)
  dates.ts      local-date helpers
  theme.ts      light / dark / system
  styles.css    design tokens and styles
tests/
  unit/         Vitest tests for the pure modules
  e2e/          Playwright tests, accessibility (axe) and offline checks
```

**State flows one way.** `main.ts` holds the task array. Every change goes through a pure function in `tasks.ts`, which returns a new array; `commit()` then saves it and calls `render()`. Because nothing is mutated in place, undo just reinserts what was removed.

**Data is treated as untrusted.** Storage can be edited by hand and backup files can come from anywhere, so both go through `schema.ts`. It repairs what it can (an unknown priority becomes low, an invalid date is dropped) and skips what it can't, instead of crashing.

**Upgrading keeps your tasks.** Version 1 stored a bare array under `stm.tasks.v1`. On first load, version 2 converts it, saves it under `stm.tasks.v2` and removes the old key.

## Quality checks

Every push runs, in GitHub Actions:

- TypeScript in strict mode, ESLint with type-aware rules, and Prettier
- 51 unit tests
- 21 browser tests, each run on a desktop and a phone viewport, covering every feature, drag by mouse and by touch, offline use after the first visit, and an axe accessibility scan in light and dark themes

## Deployment

Pushes to `main` that pass CI are deployed to GitHub Pages by `.github/workflows/deploy.yml`. Turn it on once in **Settings → Pages → Build and deployment → Source: GitHub Actions**; until then the deploy step skips itself.

The build uses relative paths, so `dist/` also works on any static host.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
