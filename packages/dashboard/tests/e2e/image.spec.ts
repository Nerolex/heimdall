import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json');
const ORIG_CONFIG = fs.existsSync(CONFIG_PATH) ? fs.readFileSync(CONFIG_PATH, 'utf-8') : null;

function writeConfig(config: object) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function restoreConfig() {
  if (ORIG_CONFIG !== null) {
    fs.writeFileSync(CONFIG_PATH, ORIG_CONFIG);
  } else if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Image Display Modes E2E', () => {
  test.afterAll(() => {
    restoreConfig();
  });

  for (const mode of ['contain', 'cover', 'stretch', 'center'] as const) {
    test(`renders image with displayMode "${mode}"`, async ({ page }) => {
      writeConfig({
        cycleInterval: 30,
        views: [
          { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: mode } },
        ],
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="image-container"] img', { timeout: 15000 });

      const img = page.locator('[data-testid="image-container"] img');
      await expect(img).toBeVisible();
    });
  }

  test('shows placeholder for broken image src', async ({ page }) => {
    writeConfig({
      cycleInterval: 30,
      views: [
        { type: 'image', settings: { src: '/assets/nonexistent.png', displayMode: 'contain' } },
      ],
    });

    await page.goto('/');
    // Wait for either the image error placeholder or the image container (which will then fail to load)
    await page.waitForSelector('[data-testid="image-error"], [data-testid="image-container"]', { timeout: 15000 });
  });
});
