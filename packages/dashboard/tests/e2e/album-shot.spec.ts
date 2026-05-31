import { test } from '@playwright/test';
test('random album view', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/album-before.png' });
});
