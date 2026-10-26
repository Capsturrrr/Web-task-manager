import { expect, test, type Page } from '@playwright/test';
import { items, sample, seed, texts } from './fixtures';

test.beforeEach(async ({ page }) => {
  await seed(page, sample);
  await page.goto('/');
});

async function dragBy(page: Page, from: number, toCenterOf: number, half: 'top' | 'bottom') {
  const handle = items(page).nth(from).locator('.drag-handle');
  await items(page).nth(from).hover();
  const h = (await handle.boundingBox())!;
  const t = (await items(page).nth(toCenterOf).boundingBox())!;
  const y = half === 'top' ? t.y + t.height * 0.25 : t.y + t.height * 0.75;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2, y, { steps: 12 });
  await page.mouse.up();
}

test('reorders by dragging with a mouse', async ({ page }) => {
  await dragBy(page, 2, 0, 'top');
  expect(await texts(page)).toEqual(['Charlie', 'Alpha', 'Bravo']);
  await page.reload();
  expect(await texts(page)).toEqual(['Charlie', 'Alpha', 'Bravo']);
});

test('reorders by dragging with a finger', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'uses Chromium touch emulation');
  const cdp = await page.context().newCDPSession(page);
  const h = (await items(page).nth(0).locator('.drag-handle').boundingBox())!;
  const target = (await items(page).nth(2).boundingBox())!;
  const x = h.x + h.width / 2;
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
  await touch('touchStart', h.y + h.height / 2);
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', h.y + ((target.y + target.height * 0.8 - h.y) * i) / 10);
  }
  await touch('touchEnd', 0);
  expect(await texts(page)).toEqual(['Bravo', 'Charlie', 'Alpha']);
});

test('reorders with the keyboard and announces the new position', async ({ page }) => {
  await items(page).nth(0).hover();
  await items(page).nth(0).locator('.drag-handle').focus();
  await page.keyboard.press('ArrowDown');
  expect(await texts(page)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  await expect(page.locator('#announcer')).toHaveText('Moved to position 2 of 3.');
  await expect(items(page).nth(1).locator('.drag-handle')).toBeFocused();
});

test('keyboard shortcuts and the priority radio group', async ({ page }) => {
  await page.keyboard.press('/');
  await expect(page.getByLabel('Search tasks')).toBeFocused();
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('n');
  await expect(page.getByLabel('New task')).toBeFocused();

  await page.getByRole('radio', { name: 'Low' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Med' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Med' })).toHaveAttribute('aria-checked', 'true');
});

test('cycles and remembers the theme', async ({ page }) => {
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'system');
  const button = page.locator('#themeToggle');
  await button.click();
  expect(await theme()).toBe('light');
  await button.click();
  expect(await theme()).toBe('dark');
  await page.reload();
  expect(await theme()).toBe('dark');
  await expect(button).toHaveAttribute('aria-label', 'Theme: dark. Switch to system.');
});

test('exports a backup and imports it into an empty list', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^tasks-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  for (const name of ['Alpha', 'Bravo', 'Charlie']) {
    await page.getByRole('button', { name: `Delete "${name}"` }).click();
  }
  await expect(items(page)).toHaveCount(0);

  await page.locator('#importFile').setInputFiles(file);
  await expect(page.getByText('Imported 3 tasks.')).toBeVisible();
  expect(await texts(page)).toEqual(['Alpha', 'Bravo', 'Charlie']);

  await page.locator('#importFile').setInputFiles(file);
  await expect(page.getByText('Imported 0 tasks, 3 already here.')).toBeVisible();
  await expect(items(page)).toHaveCount(3);
});

test('rejects a file that is not a backup', async ({ page }) => {
  await page.locator('#importFile').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": "world"}'),
  });
  await expect(page.getByText('No tasks were found in that file.')).toBeVisible();
  await expect(items(page)).toHaveCount(3);
});
