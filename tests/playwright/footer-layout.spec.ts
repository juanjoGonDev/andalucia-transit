import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const STORAGE_NOTICE_KEY = 'andalucia-transit.privacyNotice.v1';
const DISMISSED_VALUE = 'dismissed';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const VIEWPORT_EDGE_TOLERANCE_PX = 1;
const MAX_BOTTOM_STACK_GAP_PX = 24;
const FLOW_ROUTE_PATHS = [
  '/',
  '/recents',
  '/favs',
  '/favorites',
  '/news',
  '/lines',
  '/routes',
  '/settings',
  '/legal/privacy',
  '/legal/storage',
  '/legal/terms',
  '/legal/notice'
] as const;

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

  test('keeps immersive map at full viewport with navigation above the legal footer', async ({ page }) => {
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
      await assertNoVerticalDocumentScroll(page);
      await assertNavigationAboveFooter(navigation, footer);
      await assertFooterTouchesViewportBottom(footer, viewport.height);
      await assertLegalLinkHitTestable(page, footer);
      expect(await footer.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
      expect(await footer.evaluate((element) => getComputedStyle(element).backdropFilter)).not.toBe(
        'none'
      );
      await assertNoHorizontalOverflow(page);
    }
  });

  test('keeps navigation above the legal footer at maximum scroll across shell routes', async ({ page }) => {
    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);

      for (const path of FLOW_ROUTE_PATHS) {
        await open(page, path);

        const footer = page.locator('.legal-footer');
        const navigation = page.locator('.shell-actions__shell');

        await expect(footer).not.toHaveClass(/legal-footer--overlay/u);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
            )
          )
          .toBe(true);

        await assertNavigationAboveFooter(navigation, footer);
        await assertFooterTouchesViewportBottom(footer, viewport.height);
        await assertLegalLinkHitTestable(page, footer);
        await assertNoHorizontalOverflow(page);
      }
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

async function assertNavigationAboveFooter(navigation: Locator, footer: Locator): Promise<void> {
  const navigationBox = await navigation.boundingBox();
  const footerBox = await footer.boundingBox();

  expect(navigationBox).not.toBeNull();
  expect(footerBox).not.toBeNull();

  if (!navigationBox || !footerBox) {
    return;
  }

  const navigationBottom = navigationBox.y + navigationBox.height;
  const gap = footerBox.y - navigationBottom;

  expect(navigationBottom).toBeLessThanOrEqual(footerBox.y + VIEWPORT_EDGE_TOLERANCE_PX);
  expect(gap).toBeLessThanOrEqual(MAX_BOTTOM_STACK_GAP_PX);
}

async function assertFooterTouchesViewportBottom(footer: Locator, viewportHeight: number): Promise<void> {
  const footerBox = await footer.boundingBox();
  expect(footerBox).not.toBeNull();

  if (!footerBox) {
    return;
  }

  expect(Math.abs(footerBox.y + footerBox.height - viewportHeight)).toBeLessThanOrEqual(
    VIEWPORT_EDGE_TOLERANCE_PX
  );
}

async function assertLegalLinkHitTestable(page: Page, footer: Locator): Promise<void> {
  const legalLink = footer.locator('.legal-footer__link').first();
  const linkBox = await legalLink.boundingBox();

  expect(linkBox).not.toBeNull();

  if (!linkBox) {
    return;
  }

  const hitTarget = await page.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return target?.closest('.legal-footer__link')?.classList.contains('legal-footer__link') ?? false;
    },
    { x: linkBox.x + linkBox.width / 2, y: linkBox.y + linkBox.height / 2 }
  );

  expect(hitTarget).toBe(true);
}

async function assertNoVerticalDocumentScroll(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)
  ).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  ).toBe(true);
}
