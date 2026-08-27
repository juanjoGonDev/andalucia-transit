import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const HOME_PATH = '/';
const MAP_PATH = '/map';
const MOBILE_VIEWPORT_WIDTHS = [320, 360, 390, 430] as const;
const MOBILE_VIEWPORT_HEIGHT = 844;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const DRAWER_VIEWPORTS = [
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
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
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
  return !(
    first.right <= second.left + GEOMETRY_TOLERANCE_PX ||
    first.left >= second.right - GEOMETRY_TOLERANCE_PX ||
    first.bottom <= second.top + GEOMETRY_TOLERANCE_PX ||
    first.top >= second.bottom - GEOMETRY_TOLERANCE_PX
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

  test('keeps persistent shell actions clear of mobile page titles', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize({ width: 390, height: MOBILE_VIEWPORT_HEIGHT });

    for (const path of SHELL_CLEARANCE_PATHS) {
      await page.goto(new URL(path, resolvedBaseUrl).toString());

      const shell = page.locator('.shell-actions__shell');
      const title = page.locator('.app-hero__title').first();
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

  for (const viewport of DRAWER_VIEWPORTS) {
    test(`keeps the secondary navigation drawer usable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const resolvedBaseUrl = BASE_URL as string;
      await page.setViewportSize(viewport);
      await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

      const trigger = page.locator('.shell-actions__button--menu');
      const drawer = page.locator('#shell-actions-drawer');
      const close = drawer.locator('.shell-actions__drawer-close');
      const entries = drawer.locator('.shell-actions__menu-button');

      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();

      await expect(drawer).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(close).toBeFocused();
      await expect(entries).toHaveCount(3);

      const drawerBounds = await drawer.boundingBox();
      expect(drawerBounds).not.toBeNull();
      if (drawerBounds) {
        expect(drawerBounds.x).toBeGreaterThanOrEqual(-GEOMETRY_TOLERANCE_PX);
        expect(drawerBounds.x + drawerBounds.width).toBeLessThanOrEqual(
          viewport.width + GEOMETRY_TOLERANCE_PX,
        );
        expect(drawerBounds.height).toBeGreaterThanOrEqual(
          viewport.height - GEOMETRY_TOLERANCE_PX,
        );
      }

      const closeBounds = await close.boundingBox();
      expect(closeBounds?.width ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
      expect(closeBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);

      for (let index = 0; index < 3; index += 1) {
        const entryBounds = await entries.nth(index).boundingBox();
        expect(entryBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
      }

      if (EVIDENCE_DIR) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/shell-drawer-${viewport.width}x${viewport.height}.png`,
          fullPage: true,
        });
      }

      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(drawer).toBeVisible();
      await page.mouse.click(5, Math.floor(viewport.height / 2));
      await expect(drawer).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });
  }

  test('navigates through the drawer and exposes the active secondary destination', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize({ width: 390, height: MOBILE_VIEWPORT_HEIGHT });
    await page.goto(new URL(HOME_PATH, resolvedBaseUrl).toString());

    const trigger = page.locator('.shell-actions__button--menu');
    const drawer = page.locator('#shell-actions-drawer');
    await trigger.click();
    await drawer.locator('.shell-actions__menu-button[href="/settings"]').click();

    await expect(page).toHaveURL(new URL('/settings', resolvedBaseUrl).toString());
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toHaveClass(/shell-actions__button--active/);

    await trigger.click();
    await expect(drawer.locator('.shell-actions__menu-button[href="/settings"]')).toHaveAttribute(
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
