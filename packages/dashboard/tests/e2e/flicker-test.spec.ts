import { test } from '@playwright/test';
import * as fs from 'fs';

test('capture transition frames', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click and capture frames every 100ms during transition
  await page.mouse.click(870, 300);
  for (let i = 0; i <= 12; i++) {
    await page.screenshot({ path: `/tmp/frame-${String(i*100).padStart(4,'0')}ms.png` });
    const size = fs.statSync(`/tmp/frame-${String(i*100).padStart(4,'0')}ms.png`).size;
    console.log(`${i*100}ms: ${size}B`);
    await page.waitForTimeout(100);
  }
});
