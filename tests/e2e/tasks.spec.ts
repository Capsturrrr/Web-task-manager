import { expect, test } from '@playwright/test';
import { addTask, items, sample, seed, texts } from './fixtures';

test.describe('managing tasks', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, []);
    await page.goto('/');
  });

  test('adds, completes and tracks progress', async ({ page }) => {
    await expect(page.getByText('No tasks yet')).toBeVisible();
    await addTask(page, 'Write report', { priority: 'High', due: '2099-01-15' });
    await page.getByLabel('New task').fill('Buy milk');
    await page.getByLabel('New task').press('Enter');

    await expect(items(page)).toHaveCount(2);
    await expect(items(page).last()).toHaveAttribute('data-priority', 'high');
    await expect(items(page).last()).toContainText('Due 15 Jan 2099');

    await page.getByRole('checkbox', { name: 'Buy milk' }).click();
    await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    await expect(page.locator('#statDone')).toHaveText('1');
  });

  test('ignores blank tasks', async ({ page }) => {
    await page.getByLabel('New task').fill('    ');
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(items(page)).toHaveCount(0);
  });

  test('shows task text as text, never as HTML', async ({ page }) => {
    await addTask(page, '<img src=x onerror="window.pwned=1">');
    await expect(page.locator('.task-text img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as { pwned?: number }).pwned)).toBeUndefined();
  });

  test('edits inline: Enter saves, Escape cancels', async ({ page }) => {
    await addTask(page, 'Draft');
    await page.locator('.task-text').dblclick();
    await page.getByLabel(/Edit task/).fill('Final draft');
    await page.getByLabel(/Edit task/).press('Enter');
    await expect(page.locator('.task-text')).toHaveText('Final draft');

    await page.getByRole('button', { name: 'Edit "Final draft"' }).click();
    await page.getByLabel(/Edit task/).fill('should not save');
    await page.getByLabel(/Edit task/).press('Escape');
    await expect(page.locator('.task-text')).toHaveText('Final draft');
    await expect(page.getByRole('button', { name: 'Edit "Final draft"' })).toBeFocused();
  });

  test('deletes with undo from the toast and from Ctrl+Z', async ({ page }) => {
    await addTask(page, 'Keep me');
    await page.getByRole('button', { name: 'Delete "Keep me"' }).click();
    await expect(items(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(items(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Delete "Keep me"' }).click();
    await expect(items(page)).toHaveCount(0);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+z');
    await expect(items(page)).toHaveCount(1);
  });
});

test.describe('finding and organising', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, sample);
    await page.goto('/');
  });

  test('filters, searches and sorts', async ({ page }) => {
    await page.getByRole('button', { name: 'Pending' }).click();
    expect(await texts(page)).toEqual(['Alpha', 'Bravo']);
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    expect(await texts(page)).toEqual(['Charlie']);
    await page.getByRole('button', { name: 'All', exact: true }).click();

    await page.getByLabel('Search tasks').fill('rav');
    expect(await texts(page)).toEqual(['Bravo']);
    await page.getByLabel('Search tasks').fill('zzz');
    await expect(page.getByText('No tasks match "zzz".')).toBeVisible();
    await page.getByLabel('Search tasks').press('Escape');
    await expect(items(page)).toHaveCount(3);

    await page.getByLabel('Sort by').selectOption('priority');
    expect(await texts(page)).toEqual(['Bravo', 'Charlie', 'Alpha']);
    await expect(page.locator('.drag-handle').first()).toBeHidden();
  });

  test('flags overdue tasks', async ({ page }) => {
    await expect(items(page).nth(1).locator('.task-due')).toHaveText(/Overdue/);
  });

  test('clears completed tasks with undo', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear completed' }).click();
    expect(await texts(page)).toEqual(['Alpha', 'Bravo']);
    await page.getByRole('button', { name: 'Undo' }).click();
    expect(await texts(page)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  test('keeps tasks and order after a reload', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Alpha' }).click();
    await page.reload();
    expect(await texts(page)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    await expect(page.getByRole('checkbox', { name: 'Alpha' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

test('moves version-1 data to the new format without losing anything', async ({ page }) => {
  await seed(page, sample, true);
  await page.goto('/');
  expect(await texts(page)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toContain('stm.tasks.v2');
  expect(keys).not.toContain('stm.tasks.v1');
});
