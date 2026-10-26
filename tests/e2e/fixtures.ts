import { expect, type Locator, type Page } from '@playwright/test';

export const items = (page: Page): Locator => page.locator('.task-item');
export const texts = (page: Page): Promise<string[]> =>
  page.locator('.task-item .task-text').allTextContents();

export async function addTask(
  page: Page,
  text: string,
  options: { priority?: 'Low' | 'Med' | 'High'; due?: string } = {},
): Promise<void> {
  if (options.priority) await page.getByRole('radio', { name: options.priority }).click();
  if (options.due) await page.getByLabel('Due date').fill(options.due);
  await page.getByLabel('New task').fill(text);
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.locator('.task-text', { hasText: text }).first()).toBeVisible();
}

/** Seeds storage before the app loads. Pass `legacy` to write version-1 data. */
export async function seed(page: Page, tasks: object[], legacy = false): Promise<void> {
  await page.addInitScript(
    ([data, isLegacy]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      if (isLegacy) localStorage.setItem('stm.tasks.v1', JSON.stringify(data));
      else localStorage.setItem('stm.tasks.v2', JSON.stringify({ version: 2, tasks: data }));
    },
    [tasks, legacy] as const,
  );
}

export const sample = [
  { id: 'a', text: 'Alpha', priority: 'low', due: null, done: false, createdAt: 1 },
  { id: 'b', text: 'Bravo', priority: 'high', due: '2020-01-01', done: false, createdAt: 2 },
  { id: 'c', text: 'Charlie', priority: 'medium', due: '2099-06-01', done: true, createdAt: 3 },
];
