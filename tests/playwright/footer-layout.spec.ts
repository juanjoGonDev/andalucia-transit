import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const STORAGE_NOTICE_KEY = 'andalucia-transit.privacyNotice.v1';
const DISMISSED_VALUE = 'dismissed';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const VIEWPORT_EDGE_TOLERANCE_PX = 1;

test.describe('legal footer and fixed navigation layout', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ noticeKey, dismissedValue }) => {
        window.localStorage.setItem(noticeKey, dismissedValue);
      },
      { noticeKey: STORAGE_NOTICE_KEY, dismissedValue: DISMISSED_VALUE }
    );
  });

  test('keeps immersive map at full viewport with an adapted footer overlay', async ({ page }) => {
    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, '/map');

      const workspace = page.locator('.map__workspace');
      const footer = page.locator('.legal-footer');
      const navigation = page.locator('.shell-actions__shell');

      await expect(workspace).toBeVisible();
      await expect(footer).toBeVisible();
      await expect(footer).toHaveClass(/legal-footer--overlay/u);
      await expect(navigation).toBeVisible();
      await assertWorkspaceMatchesViewport(workspace, viewport.height);

      const searchTrigger = page.locator('.map-search__trigger');
      await searchTrigger.click();
      await expect(page.locator('#map-network-search')).toBeFocused();

      const nearbyTrigger = page.locator('.map__inspector--nearby > summary');
      await nearbyTrigger.click();
      await expect(page.locator('.map__inspector--nearby .map__panel')).toBeVisible();

      await assertWorkspaceMatchesViewport(workspace, viewport.height);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      const footerBox = await footer.boundingBox();
      const navigationBox = await navigation.boundingBox();

      expect(footerBox).not.toBeNull();
      expect(navigationBox).not.toBeNull();

      if (!footerBox || !navigationBox) {
        continue;
      }

      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(
        navigationBox.y + VIEWPORT_EDGE_TOLERANCE_PX
      );
      expect(await footer.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
      expect(await footer.evaluate((element) => getComputedStyle(element).backdropFilter)).not.toBe(
        'none'
      );
      await assertNoHorizontalOverflow(page);
    }
  });

  test('keeps flow footer links above fixed navigation at maximum scroll', async ({ page }) => {
    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, '/legal/privacy');

      const footer = page.locator('.legal-footer');
      const legalNavigation = page.getByRole('navigation', {
        name: 'Información legal y privacidad'
      });
      const navigation = page.locator('.shell-actions__shell');

      await expect(footer).toBeVisible();
      await expect(footer).not.toHaveClass(/legal-footer--overlay/u);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

      await assertAboveFixedNavigation(legalNavigation, navigation);
      await assertNoHorizontalOverflow(page);
    }
  });
});

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function assertWorkspaceMatchesViewport(workspace: Locator, viewportHeight: number): Promise<void> {
  const workspaceBox = await workspace.boundingBox();
  expect(workspaceBox).not.toBeNull();

  if (!workspaceBox) {
    return;
  }

  expect(Math.abs(workspaceBox.height - viewportHeight)).toBeLessThanOrEqual(
    VIEWPORT_EDGE_TOLERANCE_PX
  );
  expect(Math.abs(workspaceBox.y + workspaceBox.height - viewportHeight)).toBeLessThanOrEqual(
    VIEWPORT_EDGE_TOLERANCE_PX
  );
}

async function assertAboveFixedNavigation(content: Locator, navigation: Locator): Promise<void> {
  const contentBox = await content.boundingBox();
  const navigationBox = await navigation.boundingBox();

  expect(contentBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();

  if (!contentBox || !navigationBox) {
    return;
  }

  expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(
    navigationBox.y + VIEWPORT_EDGE_TOLERANCE_PX
  );
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  ).toBe(true);
}
