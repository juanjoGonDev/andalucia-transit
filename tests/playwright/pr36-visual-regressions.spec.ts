import { expect, test, type Locator, type Page } from './visual-evidence.fixture';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const LINES_PATH = '/lines';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const PIXEL_TOLERANCE = 1;

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function expectWorkspaceBehindNavigation(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await open(page, MAP_PATH);

  const workspace = page.locator('.map__workspace');
  const navigation = page.locator('.shell-actions__shell');
  await expect(workspace).toBeVisible();
  await expect(navigation).toBeVisible();

  const [workspaceBox, navigationBox] = await Promise.all([
    workspace.boundingBox(),
    navigation.boundingBox(),
  ]);
  expect(workspaceBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  if (!workspaceBox || !navigationBox) {
    return;
  }

  expect(
    Math.abs(workspaceBox.y + workspaceBox.height - viewport.height),
  ).toBeLessThanOrEqual(PIXEL_TOLERANCE);
  expect(navigationBox.y).toBeLessThan(workspaceBox.y + workspaceBox.height);

  const nearbyInspector = page.locator('.map__inspector--nearby');
  await nearbyInspector.locator(':scope > summary').click();
  const panel = nearbyInspector.locator('.map__panel');
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  if (panelBox) {
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(
      navigationBox.y + PIXEL_TOLERANCE,
    );
  }
}

async function expectHeroPaginationAction(
  surface: Locator,
  button: Locator,
  expectedLabel: string,
): Promise<void> {
  await expect(button).toBeVisible();
  await expect(button).toContainText(expectedLabel);
  await expect(button.locator('.material-symbols-outlined')).toBeVisible();

  const [buttonColor, heroTextColor] = await Promise.all([
    button.evaluate((element) => getComputedStyle(element).color),
    surface.evaluate((element) => getComputedStyle(element).color),
  ]);
  expect(buttonColor).toBe(heroTextColor);
}

test.describe('PR #36 reported visual regressions', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');

  test('keeps the fixed navigation over the map instead of reserving a footer strip', async ({
    page,
  }) => {
    await expectWorkspaceBehindNavigation(page, DESKTOP_VIEWPORT);
    await expectWorkspaceBehindNavigation(page, MOBILE_VIEWPORT);
  });

  test('keeps previous and next pagination actions readable on the Lines hero surface', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, LINES_PATH);

    const pagination = page.locator('.lines__pagination');
    await expect(pagination).toBeVisible({ timeout: 15_000 });
    const surface = page.locator('.lines.app-layout__surface--hero');
    const buttons = pagination.locator('.app-outline-button');
    await expect(buttons).toHaveCount(2);

    await expectHeroPaginationAction(surface, buttons.nth(0), 'Anterior');
    await expectHeroPaginationAction(surface, buttons.nth(1), 'Siguiente');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});
