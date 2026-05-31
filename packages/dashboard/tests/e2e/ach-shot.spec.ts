import { test } from '@playwright/test';
test('achievement view', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // Navigate to find the achievements view — check config for its position
  await page.waitForTimeout(2000);
  // click enough times to cycle through views
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(870, 300);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/gaming-${i}.png` });
  }
});
