# Smart Task Manager

A minimal to-do app in plain HTML, CSS and JavaScript. No framework, no build step, no backend.

## Features

- Add tasks with a priority (low, medium, high) and an optional due date; press Enter or click Add Task
- Mark tasks done; the counters and progress bar update as you go
- Filter by all, pending, completed or high priority
- Edit a task inline: click ✎ or double-click its text, Enter to save, Escape to cancel
- Overdue tasks are flagged in red
- Drag tasks to reorder them
- Everything is saved in your browser (`localStorage`), so tasks survive a refresh, and open tabs stay in sync
- Works on phones; edit and delete buttons stay visible on small screens

## Run it

Open `index.html` in a browser. That's it.

## How it's built

| File | Role |
|---|---|
| `index.html` | Layout: header, stats, progress bar, input card, filters, list |
| `taskstyle.css` | Design tokens as CSS variables, animations, responsive rules |
| `script.js` | State, rendering, storage, drag and drop |

All changes go through one array of tasks, then `save()` writes it to `localStorage` and `render()` rebuilds the list from it. Task text is always inserted with `textContent`, so typing HTML into a task can't inject markup.

Drag and drop uses the HTML5 drag API, which works with a mouse; on touch screens tasks can't be reordered yet.
