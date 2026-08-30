import { captureVisualEvidence, expect, test, type Page } from './visual-evidence.fixture';
import { captureViewportVisualEvidence } from './viewport-visual-evidence';

const BASE_URL = process.env.E2E_BASE_URL;
const HOME_PATH = '/';
const MAP_PATH = '/map';
const STORAGE_NOTICE_KEY = 'andalucia-transit.privacyNotice.v1';
const STORAGE_NOTICE_DISMISSED_VALUE = 'dismissed';
const HOME_SEARCH_END_EVIDENCE = 'home-search-end_es_390_844_viewport.png';
const MOBILE_VIEWPORT_WIDTHS = [320, 360, 390, 430] as const;
const MOBILE_VIEWPORT_HEIGHT = 844;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const OVERFLOW_VIEWPORTS = [
  { width: 390, height: MOBILE_VIEWPORT_HEIGHT },
  DESKTOP_VIEWPORT,
] as const;
const GEOMETRY_TOLERANCE_PX = 1;
const MINIMUM_TOUCH_TARGET_PX = 44;
const SHELL_CONTROL_COUNT = 5;
const SHELL_CLEARANCE_PATHS = [
  '/',
  '/routes',
  '/map',
  '/recents',
  '/favorites',
  '/settings',
  '/news',
] as const;

interface ElementBounds {
  readonly left: number;
  readonly right: number;
  readonly width: number;
  readonly height: number;
  readonly clientWidth: number;
  readonly scrollWidth: number;
  readonly selected?: boolean;
}

interface TabLayoutMetrics {
  readonly parent: Pick<ElementBounds, 'left' | 'right'>;
  readonly tabList: ElementBounds;
  readonly tabs: readonly ElementBounds[];
  readonly documentClientWidth: number;
  readonly documentScrollWidth: number;
}

interface ControlDimensions {
  readonly width: number;
  readonly height: number;
}

interface RectangleBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

async function readTabLayoutMetrics(page: Page): Promise<TabLayoutMetrics> {
  return page.locator('[role="tablist"]').evaluate((tabListElement: HTMLElement) => {
    const toBounds = (element: HTMLElement): ElementBounds => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    };

    const parentElement = tabListElement.parentElement;
    if (!(parentElement instanceof HTMLElement)) {
      throw new Error('Home tablist must have an HTMLElement parent.');
    }

    const parentRect = parentElement.getBoundingClientRect();
    const tabs = Array.from(tabListElement.querySelectorAll<HTMLElement>('[role="tab"]')).map(
      (tab) => ({
        ...toBounds(tab),
        selected: tab.getAttribute('aria-selected') === 'true',
      }),
    );

    return {
      parent: {
        left: parentRect.left,
        right: parentRect.right,
      },
      tabList: toBounds(tabListElement),
      tabs,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    } satisfies TabLayoutMetrics;
  });
}

function expectContained(inner: ElementBounds, outer: Pick<ElementBounds, 'left' | 'right'>): void {
  expect(inner.left).toBeGreaterThanOrEqual(outer.left - GEOMETRY_TOLERANCE_PX);
  expect(inner.right).toBeLessThanOrEqual(outer.right + GEOMETRY_TOLERANCE_PX);
}

function rectanglesOverlap(first: RectangleBounds, second: RectangleBounds): boolean {
  const firstRight = first.x + first.width;
  const firstBottom = first.y + first.height;
  const secondRight = second.x + second.width;
  const secondBottom = second.y + second.height;

  return !(
    firstRight <= second.x + GEOMETRY_TOLERANCE_PX ||
    first.x >= secondRight - GEOMETRY_TOLERANCE_PX ||
    firstBottom <= second.y + GEOMETRY_TOLERANCE_PX ||
    first.y >= secondBottom - GEOMETRY_TOLERANCE_PX
  );
}

test.describe('home tabs responsive layout', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for home tabs tests.');

  for (const viewportWidth of MOBILE_VIEWPORT_WIDTHS) {
    test(`keeps all tabs usable within ${viewportWidth}px`, async ({ page }) => {
      const resolvedBaseUrl = BASE_URL as string;
      await page.setViewportSize({ width: viewportWidth, height: MOBILE_VIEWPORT_HEIGHT });
      await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

      const tabList = page.locator('[role="tablist"]');
      const tabs = tabList.locator('[role="tab"]');
      await expect(tabList).toBeVisible();
      await expect(tabs).toHaveCount(3);

      const metrics = await readTabLayoutMetrics(page);
      expectContained(metrics.tabList, metrics.parent);
      expect(metrics.tabList.scrollWidth).toBeLessThanOrEqual(
        metrics.tabList.clientWidth + GEOMETRY_TOLERANCE_PX,
      );
      expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
        metrics.documentClientWidth + GEOMETRY_TOLERANCE_PX,
      );

      for (const tab of metrics.tabs) {
        expectContained(tab, metrics.tabList);
        expect(tab.scrollWidth).toBeLessThanOrEqual(tab.clientWidth + GEOMETRY_TOLERANCE_PX);
        expect(tab.height).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
      }

      for (let index = 0; index < metrics.tabs.length - 1; index += 1) {
        expect(metrics.tabs[index].right).toBeLessThanOrEqual(
          metrics.tabs[index + 1].left + GEOMETRY_TOLERANCE_PX,
        );
      }

      const widths = metrics.tabs.map((tab) => tab.width);
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);

      const initiallySelected = metrics.tabs.filter((tab) => tab.selected);
      expect(initiallySelected).toHaveLength(1);
      expectContained(initiallySelected[0], metrics.tabList);

      const firstTab = tabs.first();
      await firstTab.focus();
      await expect(firstTab).toBeFocused();
      const focusShadow = await firstTab.evaluate((element) => getComputedStyle(element).boxShadow);
      expect(focusShadow).not.toBe('none');

      const lastTab = tabs.last();
      await lastTab.click();
      await expect(lastTab).toHaveAttribute('aria-selected', 'true');

      const switchedMetrics = await readTabLayoutMetrics(page);
      const selectedAfterSwitch = switchedMetrics.tabs.filter((tab) => tab.selected);
      expect(selectedAfterSwitch).toHaveLength(1);
      expectContained(selectedAfterSwitch[0], switchedMetrics.tabList);
    });
  }

  test('captures Home search at document end in the canonical mobile viewport', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.addInitScript(
      ({ storageKey, dismissedValue }) => {
        window.localStorage.setItem(storageKey, dismissedValue);
      },
      { storageKey: STORAGE_NOTICE_KEY, dismissedValue: STORAGE_NOTICE_DISMISSED_VALUE },
    );
    await page.setViewportSize({ width: 390, height: MOBILE_VIEWPORT_HEIGHT });

    const url = new URL(HOME_PATH, resolvedBaseUrl);
    url.searchParams.set('tab', 'search');
    await page.goto(url.toString());
    await expect(page.locator('.route-search-form__submit')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() =>
        page.evaluate(
          () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
        ),
      )
      .toBe(true);

    await captureViewportVisualEvidence(page, HOME_SEARCH_END_EVIDENCE);
  });

  test('keeps persistent shell actions clear of mobile page titles', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize({ width: 390, height: MOBILE_VIEWPORT_HEIGHT });

    for (const path of SHELL_CLEARANCE_PATHS) {
      await page.goto(new URL(path, resolvedBaseUrl).toString());

      const shell = page.locator('.shell-actions__shell');
      const title = page.getByRole('heading', { level: 1 }).first();
      await expect(shell).toBeVisible();
      await expect(title).toBeVisible();

      const shellBounds = await shell.boundingBox();
      const titleBounds = await title.boundingBox();
      expect(shellBounds).not.toBeNull();
      expect(titleBounds).not.toBeNull();

      if (!shellBounds || !titleBounds) {
        continue;
      }

      expect(rectanglesOverlap(shellBounds, titleBounds), `${path} shell/title overlap`).toBe(
        false,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${path} horizontal overflow`,
      ).toBe(true);
    }
  });

  for (const viewport of OVERFLOW_VIEWPORTS) {
    test(`keeps shell clearance inside routed surfaces at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const resolvedBaseUrl = BASE_URL as string;
      await page.setViewportSize(viewport);

      for (const path of SHELL_CLEARANCE_PATHS) {
        await page.goto(new URL(path, resolvedBaseUrl).toString());
        await expect(page.locator('.app-layout__surface').first()).toBeVisible();

        const shellSectionPaddingBottom = await page
          .locator('.app-shell__section')
          .evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBottom));
        expect(shellSectionPaddingBottom, `${path} outer shell bottom padding`).toBe(0);

        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const surfaceOwnsBottomEdge = await page.evaluate(() => {
          const element = document.elementFromPoint(1, window.innerHeight - 1);
          return element?.closest('.app-layout__surface') !== null;
        });
        expect(surfaceOwnsBottomEdge, `${path} bottom edge must remain inside page surface`).toBe(
          true,
        );
      }
    });
  }

  test('navigates between Home and Map through persistent shell shortcuts', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize({ width: 390, height: MOBILE_VIEWPORT_HEIGHT });
    await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

    const homeLink = page.locator('.shell-actions__button--quick[href="/"]');
    const mapLink = page.locator('.shell-actions__button--quick[href="/map"]');

    await expect(homeLink).toBeVisible();
    await expect(mapLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('aria-current', 'page');
    await expect(mapLink).not.toHaveAttribute('aria-current', 'page');

    const homeBounds = await homeLink.boundingBox();
    const mapBounds = await mapLink.boundingBox();
    expect(homeBounds?.width ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    expect(homeBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    expect(mapBounds?.width ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    expect(mapBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);

    await mapLink.click();
    await expect(page).toHaveURL(new URL(MAP_PATH, resolvedBaseUrl).toString());
    await expect(page.locator('.shell-actions__button--quick[href="/map"]')).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.locator('.shell-actions__button--quick[href="/"]').click();
    await expect(page).toHaveURL(
      (url) => url.pathname === HOME_PATH && url.searchParams.get('tab') === 'search',
    );
    await expect(page.locator('.shell-actions__button--quick[href="/"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  for (const viewport of OVERFLOW_VIEWPORTS) {
    test(`keeps the secondary navigation overflow usable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const resolvedBaseUrl = BASE_URL as string;
      await page.setViewportSize(viewport);
      await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

      const trigger = page.locator('.shell-actions__button--menu');
      const shell = page.locator('.shell-actions__shell');
      const overflow = page.locator('#shell-actions-overflow');

      await expect(trigger).toHaveAttribute('aria-controls', 'shell-actions-overflow');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();

      await expect(overflow).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const entries = overflow.locator('.shell-actions__menu-button');
      await expect(entries).toHaveCount(3);

      const overflowBounds = await overflow.boundingBox();
      const shellBounds = await shell.boundingBox();
      expect(overflowBounds).not.toBeNull();
      expect(shellBounds).not.toBeNull();
      if (overflowBounds && shellBounds) {
        expect(overflowBounds.x).toBeGreaterThanOrEqual(-GEOMETRY_TOLERANCE_PX);
        expect(overflowBounds.x + overflowBounds.width).toBeLessThanOrEqual(
          viewport.width + GEOMETRY_TOLERANCE_PX,
        );
        expect(overflowBounds.y).toBeGreaterThanOrEqual(-GEOMETRY_TOLERANCE_PX);
        expect(overflowBounds.y + overflowBounds.height).toBeLessThanOrEqual(
          shellBounds.y + GEOMETRY_TOLERANCE_PX,
        );
      }

      for (let index = 0; index < 3; index += 1) {
        const entryBounds = await entries.nth(index).boundingBox();
        expect(entryBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
      }

      await captureVisualEvidence(page, `shell-drawer-${viewport.width}x${viewport.height}.png`);

      await page.keyboard.press('Escape');
      await expect(overflow).not.toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(overflow).toBeVisible();
      await page.mouse.click(5, Math.floor(viewport.height / 2));
      await expect(overflow).not.toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  }

  test('navigates through the overflow and exposes the active secondary destination', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize({ width: 390, height: MOBILE_VIEWPORT_HEIGHT });
    await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

    const trigger = page.locator('.shell-actions__button--menu');
    const overflow = page.locator('#shell-actions-overflow');
    await trigger.click();
    await overflow.locator('.shell-actions__menu-button[href="/settings"]').click();

    await expect(page).toHaveURL(new URL('/settings', resolvedBaseUrl).toString());
    await expect(overflow).not.toBeVisible();
    await expect(trigger).toHaveClass(/shell-actions__button--active/);

    await trigger.click();
    await expect(overflow.locator('.shell-actions__menu-button[href="/settings"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('animates persistent shell controls on hover without layout shift', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

    const controls = page.locator('.shell-actions__button');
    await expect(controls).toHaveCount(SHELL_CONTROL_COUNT);

    for (let index = 0; index < SHELL_CONTROL_COUNT; index += 1) {
      const control = controls.nth(index);
      const dimensionsBefore = await control.evaluate<ControlDimensions>(
        (element: HTMLElement) => ({
          width: element.offsetWidth,
          height: element.offsetHeight,
        }),
      );
      const transformBefore = await control.evaluate(
        (element) => getComputedStyle(element).transform,
      );

      await control.hover();
      await expect
        .poll(() => control.evaluate((element) => getComputedStyle(element).transform))
        .not.toBe(transformBefore);

      const transformDuringHover = await control.evaluate(
        (element) => getComputedStyle(element).transform,
      );
      const dimensionsDuringHover = await control.evaluate<ControlDimensions>(
        (element: HTMLElement) => ({
          width: element.offsetWidth,
          height: element.offsetHeight,
        }),
      );

      expect(transformDuringHover).not.toBe('none');
      expect(dimensionsDuringHover).toEqual(dimensionsBefore);
    }
  });

  test('removes shell hover movement when reduced motion is requested', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

    const mapLink = page.locator('.shell-actions__button--quick[href="/map"]');
    await expect(mapLink).toBeVisible();
    await mapLink.hover();

    expect(await mapLink.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
    expect(await mapLink.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
      '0s',
    );
  });
});
