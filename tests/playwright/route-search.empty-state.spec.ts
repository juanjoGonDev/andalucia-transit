import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const hasBaseUrl = Boolean(BASE_URL);

const ROUTE_SEARCH_SUITE = 'route search empty state';

const ORIGIN_SLUG = 'a-7075-km-8-200--c4s592';
const DESTINATION_SLUG = 'acceso-a-albolote--c3s2';
const ROUTE_DATE = '2025-10-31';

const EMPTY_TITLE_SELECTOR = '.route-search__empty-title';
const EMPTY_DESCRIPTION_SELECTOR = '.route-search__empty-description';
const EMPTY_ACTION_SELECTOR = '.route-search__empty-action';

const resolveRouteSearchUrl = (): string => {
  if (!hasBaseUrl) {
    throw new Error('E2E_BASE_URL environment variable is required for route search tests.');
  }

  const resolvedBase = BASE_URL as string;
  const path = `/routes/${ORIGIN_SLUG}/to/${DESTINATION_SLUG}/on/${ROUTE_DATE}`;
  return new URL(path, resolvedBase).toString();
};

test.describe(ROUTE_SEARCH_SUITE, () => {
  test.skip(!hasBaseUrl, 'E2E_BASE_URL environment variable is required for route search tests.');

  test('presents localized guidance when no direct routes exist', async ({ page }) => {
    const routeSearchUrl = resolveRouteSearchUrl();

    await page.goto(routeSearchUrl);

    const title = page.locator(EMPTY_TITLE_SELECTOR);
    await expect(title).toBeVisible();
    await expect(title).toHaveText('No encontramos una ruta directa para esta búsqueda.');

    const description = page.locator(EMPTY_DESCRIPTION_SELECTOR);
    await expect(description).toHaveText(
      'Prueba a intercambiar las paradas o elige alternativas cercanas para explorar otras opciones.'
    );

    const action = page.locator(EMPTY_ACTION_SELECTOR);
    await expect(action).toHaveText('Ajustar filtros de búsqueda');

    await page.evaluate(() => {
      localStorage.setItem('andalucia-transit.language', 'en');
    });

    await page.goto(routeSearchUrl);

    await expect(page.locator(EMPTY_TITLE_SELECTOR)).toHaveText(
      "We couldn't find a direct route for this search."
    );
    await expect(page.locator(EMPTY_DESCRIPTION_SELECTOR)).toHaveText(
      'Try swapping your stops or picking nearby alternatives to explore other routes.'
    );
    await expect(page.locator(EMPTY_ACTION_SELECTOR)).toHaveText('Adjust search filters');
  });
});
