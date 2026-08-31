import { buildExactNewsList } from '../../scripts/visual/exact-visual-data';
import {
  captureVisualEvidence,
  EXACT_VISUAL_REGRESSION,
  expect,
  test,
  type Page,
} from './visual-evidence.fixture';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const NEWS_LIST_URL_PATTERN =
  /^https:\/\/api\.ctan\.es\/v1\/Consorcios\/(\d+)\/noticias(?:\?.*)?$/u;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const NEWS_PAGE_SIZE = 8;

async function installExactNewsFeed(page: Page): Promise<void> {
  await page.route(NEWS_LIST_URL_PATTERN, async (route) => {
    const match = NEWS_LIST_URL_PATTERN.exec(route.request().url());
    const consortiumId = Number(match?.[1]);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildExactNewsList(consortiumId)),
    });
  });
}

test.describe('exact News visual data', () => {
  test.use({ locale: 'es-ES' });

  test.skip(!BASE_URL, 'E2E_BASE_URL is required for exact News visual evidence.');
  test.skip(MOCK_MODE !== 'data', 'E2E_MOCK_MODE=data is required for exact News evidence.');
  test.skip(!EXACT_VISUAL_REGRESSION, 'Exact News fixture is only for zero-tolerance regression.');

  test('captures canonical unfiltered News on mobile and desktop', async ({ page }) => {
    await installExactNewsFeed(page);

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await page.goto(new URL('/news', BASE_URL as string).toString());

      await expect(page.locator('.news__card')).toHaveCount(NEWS_PAGE_SIZE, { timeout: 15_000 });
      await expect(page.getByText('Noticia CTAN sin contenido')).toHaveCount(0);
      await expect(page.locator('.news__pagination-slot--bottom .news__pagination')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await captureVisualEvidence(
        page,
        `news-data_es_${viewport.width}_${viewport.height}_full.png`,
      );
    }
  });
});
