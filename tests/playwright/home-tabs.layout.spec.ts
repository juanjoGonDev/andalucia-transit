import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const HOME_PATH = '/';
const MOBILE_VIEWPORT_WIDTHS = [320, 360, 390, 430] as const;
const MOBILE_VIEWPORT_HEIGHT = 844;
const GEOMETRY_TOLERANCE_PX = 1;
const MINIMUM_TOUCH_TARGET_PX = 44;

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

async function readTabLayoutMetrics(page: Parameters<typeof test>[0] extends never ? never : any) {
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

      const metrics = (await readTabLayoutMetrics(page)) as TabLayoutMetrics;
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
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(
        GEOMETRY_TOLERANCE_PX,
      );

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

      const switchedMetrics = (await readTabLayoutMetrics(page)) as TabLayoutMetrics;
      const selectedAfterSwitch = switchedMetrics.tabs.filter((tab) => tab.selected);
      expect(selectedAfterSwitch).toHaveLength(1);
      expectContained(selectedAfterSwitch[0], switchedMetrics.tabList);
    });
  }
});
