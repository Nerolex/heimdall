import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('click right 6 times, no crashes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const sizes: number[] = [];
  for (let i = 1; i <= 6; i++) {
    await page.mouse.click(870, 300);
    await page.waitForTimeout(1500);
    const p = `/tmp/click-${i}.png`;
    await page.screenshot({ path: p });
    const size = fs.statSync(p).size;
    sizes.push(size);
    console.log(`click ${i}: ${size}B`);
  }

  expect(errors, 'No JS exceptions').toHaveLength(0);
  for (let i = 0; i < sizes.length; i++) {
    expect(sizes[i], `screenshot after click ${i+1} should not be black`).toBeGreaterThan(20000);
  }
});
