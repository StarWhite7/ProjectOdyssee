import { expect, test } from '@playwright/test';

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 1024 },
];

test.beforeEach(async ({ page, context }) => {
  await context.route('**/config.js', async (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "window.__ODYSSEE_CONFIG__={supabaseUrl:'',supabaseAnonKey:''};",
    }),
  );
  await page.goto('/');
});

for (const viewport of viewports) {
  test(`keeps the hero readable without horizontal overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.reload();

    await expect(page.getByRole('heading', { name: /Votre histoire/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Commencer une aventure/ }).first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  });
}

test('opens and closes the mobile menu with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.reload();
  const menuButton = page.getByRole('button', { name: 'Ouvrir le menu' });

  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toHaveCount(0);
});

test('pauses the decorative video when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  await expect.poll(() => page.locator('video').evaluate((video) => video.paused)).toBe(true);
});
