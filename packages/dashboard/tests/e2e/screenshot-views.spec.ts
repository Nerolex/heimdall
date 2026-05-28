import { test } from '@playwright/test';
test('screenshot all views', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/view-0-today.png' });
  await page.mouse.click(870, 300); await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/view-1-weekend.png' });
  await page.mouse.click(870, 300); await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/view-2-upcoming.png' });
});
