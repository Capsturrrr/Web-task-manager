import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { items, sample, seed } from './fixtures';

for (const scheme of ['light', 'dark'] as const) {
  test(`has no WCAG A/AA accessibility violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await seed(page, sample);
    await page.goto('/');
    await expect(items(page)).toHaveCount(3);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}

test('works offline after the first visit', async ({ page, context }) => {
  await seed(page, sample);
  await page.goto('/');
  // Wait until the service worker has cached the app and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(items(page)).toHaveCount(3);
  await page.getByLabel('New task').fill('Added while offline');
  await page.getByLabel('New task').press('Enter');
  await expect(items(page)).toHaveCount(4);
  await context.setOffline(false);
});

test('ships an installable web app manifest', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { name: string; display: string; icons: object[] };
  expect(manifest).toMatchObject({ name: 'Smart Task Manager', display: 'standalone' });
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
});
