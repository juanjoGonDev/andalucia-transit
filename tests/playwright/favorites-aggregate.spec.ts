import { expect, test, type Page } from './visual-evidence.fixture';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const FAVORITES_PATH = '/favorites';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const STOP_FAVORITE_COUNT = 2;
const LINE_FAVORITE_COUNT = 1;
const AGGREGATE_FAVORITE_COUNT = STOP_FAVORITE_COUNT + LINE_FAVORITE_COUNT;

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

test.describe('aggregate favorites product checks', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');
  test.skip(MOCK_MODE !== 'data', 'Aggregate favorites checks require deterministic data mode.');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('combines deterministic line and stop favorites without CTAN NN placeholders', async ({
    page,
  }) => {
    await open(page, FAVORITES_PATH);

    await expect(page.locator('.favorites__item')).toHaveCount(AGGREGATE_FAVORITE_COUNT);
    await expect(page.locator('.favorites__entity-title')).toHaveText(['Líneas', 'Paradas']);
    await expect(page.getByText('Circular Huércal de Almería', { exact: true })).toBeVisible();

    const names = await page.locator('.favorites-card__name').allTextContents();
    expect(names).toHaveLength(AGGREGATE_FAVORITE_COUNT);
    for (const name of names) {
      expect(name).not.toMatch(/\sNN\s*$/iu);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});
