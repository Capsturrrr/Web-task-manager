# Changelog

## 2.0.0 (2026-10-26)

Rebuilt in TypeScript with Vite. Existing tasks are migrated automatically.

### Added

- Undo for delete, clear completed and import (toast button or Ctrl+Z)
- Search, and sorting by due date, priority or newest
- Export and import of tasks as a JSON backup
- Dark mode that follows the system, with a light/dark/system toggle
- Installable offline app (PWA); fonts are bundled instead of loaded from Google
- Drag to reorder on touch screens, and keyboard reordering with the arrow keys
- Keyboard shortcuts: `/` search, `n` new task
- "Clear completed"
- Screen-reader support: labelled controls, live announcements, checkbox and radio roles, a skip link

### Changed

- Text and badge colours darkened to meet WCAG AA contrast
- Only newly added tasks animate in, instead of the whole list on every change
- Respects the reduced-motion setting

### Fixed

- Tasks could be reordered only with a mouse; drag now uses pointer events
- Pressing Enter to save an edit could reopen the editor

## 1.0.0

First version in plain HTML, CSS and JavaScript.
