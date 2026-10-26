export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const THEME_KEY = 'stm.theme';

export function loadTheme(store: Pick<Storage, 'getItem'>): Theme {
  try {
    const saved = store.getItem(THEME_KEY);
    return THEMES.includes(saved as Theme) ? (saved as Theme) : 'system';
  } catch {
    return 'system';
  }
}

export function saveTheme(store: Pick<Storage, 'setItem'>, theme: Theme): void {
  try {
    store.setItem(THEME_KEY, theme);
  } catch {
    // not remembered across visits; still applied now
  }
}

/** system → light → dark → system */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system';
}

/** "system" removes the attribute so the CSS media query decides. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}
