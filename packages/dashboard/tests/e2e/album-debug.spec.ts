import { test } from '@playwright/test';
test('album overlay debug', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Check the computed padding-top on the layout div
  const padTop = await page.evaluate(() => {
    const el = document.querySelector('[class*="layout"]') as HTMLElement | null;
    if (!el) return 'not found';
    return window.getComputedStyle(el).paddingTop;
  });
  const overlayH = await page.evaluate(() => {
    const el = document.querySelector('[class*="layout"]') as HTMLElement | null;
    if (!el) return 'not found';
    return window.getComputedStyle(el).getPropertyValue('--overlay-height').trim() || getComputedStyle(document.documentElement).getPropertyValue('--overlay-height').trim();
  });
  console.log('padding-top:', padTop, '| --overlay-height:', overlayH);
  await page.screenshot({ path: '/tmp/album-before.png' });
});
