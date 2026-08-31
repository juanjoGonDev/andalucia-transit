import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const STORAGE_NOTICE_KEY = 'andalucia-transit.privacyNotice.v1';
const DISMISSED_VALUE = 'dismissed';
const REPORTED_MOBILE_VIEWPORT = { width: 375, height: 667 } as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const VIEWPORT_EDGE_TOLERANCE_PX = 1;
const MAX_BOTTOM_STACK_GAP_PX = 24;
const MIN_CONTROL_NAVIGATION_GAP_PX = 12;
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

  test('keeps first-visit storage notice above immersive map controls without document scroll', async ({
    page
  }) => {
    await showStorageNoticeOnLoad(page);

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, '/map');

      const notice = page.locator('.storage-notice');
      const workspace = page.locator('.map__workspace');

      await expect(notice).toBeVisible();
      await expect(workspace).toBeVisible();
      await assertWorkspaceFillsRemainingViewport(workspace, notice, viewport.height);
      await assertNoVerticalDocumentScroll(page);

      const searchTrigger = page.locator('.map-search__trigger');
      await searchTrigger.click();
      await expect(page.locator('#map-network-search')).toBeFocused();

      const linesTrigger = page.locator('.map__inspector--lines > summary');
      await linesTrigger.click();
      await expect(page.locator('.map__inspector--lines .map__panel')).toBeVisible();

      await notice.locator('.storage-notice__dismiss').click();
      await expect(notice).toBeHidden();
      await assertWorkspaceMatchesViewport(workspace, viewport.height);
      await assertNoVerticalDocumentScroll(page);
      await assertNoHorizontalOverflow(page);
    }
  });

  test('keeps immersive map at full viewport with navigation above the legal footer', async ({ page }) => {
    await dismissStorageNoticeOnLoad(page);

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
      await assertMapAttributionClearOfNavigation(page, navigation);
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
    await dismissStorageNoticeOnLoad(page);

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);

      for (const path of FLOW_ROUTE_PATHS) {
        await open(page, path);

        const footer = page.locator('.legal-footer');
        const navigation = page.locator('.shell-actions__shell');

        await expect(footer).not.toHaveClass(/legal-footer--overlay/u);
        await scrollToDocumentEnd(page);

        await assertNavigationAboveFooter(navigation, footer);
        await assertFooterTouchesViewportBottom(footer, viewport.height);
        await assertLegalLinkHitTestable(page, footer);
        await assertNoHorizontalOverflow(page);
      }
    }
  });

  test('keeps Home search submit clear of raised navigation at document end', async ({ page }) => {
    await dismissStorageNoticeOnLoad(page);

    for (const viewport of [REPORTED_MOBILE_VIEWPORT, MOBILE_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, '/?tab=search');

      const submit = page.locator('.home__panel--search .route-search-form__submit');
      const footer = page.locator('.legal-footer');
      const navigation = page.locator('.shell-actions__shell');

      await expect(submit).toBeVisible();
      await expect(submit).toHaveAttribute('aria-disabled', 'true');
      await expect(footer).not.toHaveClass(/legal-footer--overlay/u);
      await scrollToDocumentEnd(page);

      await assertNavigationAboveFooter(navigation, footer);
      await assertControlClearOfNavigation(page, submit, navigation);
      await assertLegalLinkHitTestable(page, footer);
      await assertNoHorizontalOverflow(page);
    }
  });
});

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function dismissStorageNoticeOnLoad(page: Page): Promise<void> {
  await page.addInitScript(
    ({ noticeKey, dismissedValue }) => {
      window.localStorage.setItem(noticeKey, dismissedValue);
    },
    { noticeKey: STORAGE_NOTICE_KEY, dismissedValue: DISMISSED_VALUE }
  );
}

async function showStorageNoticeOnLoad(page: Page): Promise<void> {
  await page.addInitScript(
    ({ noticeKey }) => {
      window.localStorage.removeItem(noticeKey);
    },
    { noticeKey: STORAGE_NOTICE_KEY }
  );
}

async function scrollToDocumentEnd(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(
        () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
      )
    )
    .toBe(true);
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

async function assertWorkspaceFillsRemainingViewport(
  workspace: Locator,
  notice: Locator,
  viewportHeight: number
): Promise<void> {
  const workspaceBox = await workspace.boundingBox();
  const noticeBox = await notice.boundingBox();

  expect(workspaceBox).not.toBeNull();
  expect(noticeBox).not.toBeNull();

  if (!workspaceBox || !noticeBox) {
    return;
  }

  const noticeBottom = noticeBox.y + noticeBox.height;

  expect(Math.abs(workspaceBox.y - noticeBottom)).toBeLessThanOrEqual(VIEWPORT_EDGE_TOLERANCE_PX);
  expect(Math.abs(workspaceBox.y + workspaceBox.height - viewportHeight)).toBeLessThanOrEqual(
    VIEWPORT_EDGE_TOLERANCE_PX
  );
}

async function assertNavigationAboveFooter(navigation: Locator, footer: Locator): Promise<void> {
  await expect
    .poll(async () => {
      const navigationBox = await navigation.boundingBox();
      const footerBox = await footer.boundingBox();

      if (!navigationBox || !footerBox) {
        return null;
      }

      const navigationBottom = navigationBox.y + navigationBox.height;
      const gap = footerBox.y - navigationBottom;

      return {
        navigationAboveFooter:
          navigationBottom <= footerBox.y + VIEWPORT_EDGE_TOLERANCE_PX,
        gapWithinLimit: gap <= MAX_BOTTOM_STACK_GAP_PX
      };
    })
    .toEqual({ navigationAboveFooter: true, gapWithinLimit: true });
}

async function assertMapAttributionClearOfNavigation(page: Page, navigation: Locator): Promise<void> {
  const attribution = page.locator('.leaflet-control-attribution');
  const osmLink = attribution.getByRole('link', { name: /OpenStreetMap/u });

  await expect(attribution).toBeVisible();
  await expect(osmLink).toBeVisible();

  await expect
    .poll(async () => {
      const attributionBox = await attribution.boundingBox();
      const osmLinkBox = await osmLink.boundingBox();
      const navigationBox = await navigation.boundingBox();

      if (!attributionBox || !osmLinkBox || !navigationBox) {
        return null;
      }

      const hitTest = await page.evaluate(
        ({ attributionPoint, osmPoint }) => ({
          attribution:
            document
              .elementFromPoint(attributionPoint.x, attributionPoint.y)
              ?.closest('.leaflet-control-attribution') !== null,
          osmLink:
            document.elementFromPoint(osmPoint.x, osmPoint.y)?.closest('a')?.textContent?.includes(
              'OpenStreetMap'
            ) ?? false
        }),
        {
          attributionPoint: {
            x: attributionBox.x + attributionBox.width / 2,
            y: attributionBox.y + attributionBox.height / 2
          },
          osmPoint: {
            x: osmLinkBox.x + osmLinkBox.width / 2,
            y: osmLinkBox.y + osmLinkBox.height / 2
          }
        }
      );

      return {
        attributionAboveNavigation:
          attributionBox.y + attributionBox.height <= navigationBox.y + VIEWPORT_EDGE_TOLERANCE_PX,
        attributionHitTestable: hitTest.attribution,
        osmLinkHitTestable: hitTest.osmLink
      };
    })
    .toEqual({
      attributionAboveNavigation: true,
      attributionHitTestable: true,
      osmLinkHitTestable: true
    });
}

async function assertControlClearOfNavigation(
  page: Page,
  control: Locator,
  navigation: Locator
): Promise<void> {
  await expect
    .poll(async () => {
      const controlBox = await control.boundingBox();
      const navigationBox = await navigation.boundingBox();

      if (!controlBox || !navigationBox) {
        return null;
      }

      const controlBottom = controlBox.y + controlBox.height;
      const gap = navigationBox.y - controlBottom;
      const center = {
        x: controlBox.x + controlBox.width / 2,
        y: controlBox.y + controlBox.height / 2
      };
      const lowerInset = {
        x: controlBox.x + controlBox.width / 2,
        y: controlBox.y + controlBox.height - 2
      };
      const navigationInterception = await page.evaluate(
        ({ centerPoint, lowerPoint }) => {
          const isNavigationTarget = (point: { x: number; y: number }): boolean =>
            document.elementFromPoint(point.x, point.y)?.closest('.shell-actions__shell') !== null;

          return {
            center: isNavigationTarget(centerPoint),
            lowerInset: isNavigationTarget(lowerPoint)
          };
        },
        { centerPoint: center, lowerPoint: lowerInset }
      );

      return {
        gapSufficient: gap >= MIN_CONTROL_NAVIGATION_GAP_PX,
        centerInterceptedByNavigation: navigationInterception.center,
        lowerInsetInterceptedByNavigation: navigationInterception.lowerInset
      };
    })
    .toEqual({
      gapSufficient: true,
      centerInterceptedByNavigation: false,
      lowerInsetInterceptedByNavigation: false
    });
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
