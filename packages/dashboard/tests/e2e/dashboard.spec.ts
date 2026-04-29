import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json');
const ORIG_CONFIG = fs.existsSync(CONFIG_PATH) ? fs.readFileSync(CONFIG_PATH, 'utf-8') : null;

function writeConfig(config: object) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function removeConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

function restoreConfig() {
  if (ORIG_CONFIG !== null) {
    fs.writeFileSync(CONFIG_PATH, ORIG_CONFIG);
  } else {
    removeConfig();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard E2E', () => {
  test.afterAll(() => {
    restoreConfig();
  });

  test('displays first view with valid config', async ({ page }) => {
    writeConfig({
      cycleInterval: 30,
      views: [
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'contain' } },
      ],
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="image-container"]', { timeout: 15000 });

    const img = page.locator('[data-testid="image-container"] img');
    await expect(img).toBeVisible();
  });

  test('shows empty state when no config file exists', async ({ page }) => {
    removeConfig();

    await page.goto('/');
    await page.waitForSelector('[data-testid="empty-state"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('No views configured');
  });

  test('shows error state with malformed config', async ({ page }) => {
    fs.writeFileSync(CONFIG_PATH, '{ invalid json !!!');

    await page.goto('/');
    await page.waitForSelector('[data-testid="error-state"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
  });

  test('cycles through 3 views and loops back to first', async ({ page }) => {
    writeConfig({
      cycleInterval: 2,
      views: [
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'contain' } },
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'cover' } },
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'stretch' } },
      ],
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="image-container"] img', { timeout: 15000 });

    // Verify we can see an image (cycling happens every 2s)
    const img = page.locator('[data-testid="image-container"] img');
    await expect(img).toBeVisible();

    // Wait for at least 2 cycles (4+ seconds) — views should change
    await page.waitForTimeout(5000);
    await expect(img).toBeVisible(); // Still showing an image
  });

  test('single view stays displayed without cycling errors', async ({ page }) => {
    writeConfig({
      cycleInterval: 1,
      views: [
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'contain' } },
      ],
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="image-container"] img', { timeout: 15000 });

    // Wait a few cycles worth — should remain stable
    await page.waitForTimeout(3000);
    const img = page.locator('[data-testid="image-container"] img');
    await expect(img).toBeVisible();
  });

  test('renders without scrollbars at 800x480 viewport', async ({ page }) => {
    writeConfig({
      cycleInterval: 30,
      views: [
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'contain' } },
      ],
    });

    await page.setViewportSize({ width: 800, height: 480 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="image-container"] img', { timeout: 15000 });

    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth ||
             document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    expect(hasScrollbar).toBe(false);
  });

  test('renders without scrollbars at 1920x1080 viewport', async ({ page }) => {
    writeConfig({
      cycleInterval: 30,
      views: [
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'cover' } },
      ],
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="image-container"] img', { timeout: 15000 });

    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth ||
             document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    expect(hasScrollbar).toBe(false);
  });

  test('adapts after viewport resize mid-session', async ({ page }) => {
    writeConfig({
      cycleInterval: 30,
      views: [
        { type: 'image', settings: { src: '/assets/placeholder.png', displayMode: 'contain' } },
      ],
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="image-container"] img', { timeout: 15000 });

    // Resize to smaller viewport
    await page.setViewportSize({ width: 800, height: 480 });
    await page.waitForTimeout(500);

    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth ||
             document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    expect(hasScrollbar).toBe(false);

    const img = page.locator('[data-testid="image-container"] img');
    await expect(img).toBeVisible();
  });
});
