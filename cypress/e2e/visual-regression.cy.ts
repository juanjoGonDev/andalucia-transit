interface CompareSnapshotResult {
  readonly diffPixels: number;
  readonly diffPath: string;
  readonly baselineCreated: boolean;
}

import { APP_CONFIG } from '../../src/app/core/config';

const HOME_LAYOUT_ES_SNAPSHOT = 'home-layout-es' as const;
const HOME_LAYOUT_EN_SNAPSHOT = 'home-layout-en' as const;
const FAVORITES_LAYOUT_ES_SNAPSHOT = 'favorites-layout-es' as const;
const FAVORITES_LAYOUT_EN_SNAPSHOT = 'favorites-layout-en' as const;
const ROUTE_SEARCH_LAYOUT_ES_SNAPSHOT = 'route-search-layout-es' as const;
const ROUTE_SEARCH_LAYOUT_EN_SNAPSHOT = 'route-search-layout-en' as const;
const ROUTE_SEARCH_SELECTOR = '.route-search' as const;

type SnapshotScenario = {
  readonly name: string;
  readonly path: string;
  readonly readySelector: string;
};

type QueryParams = Record<string, string | undefined>;

const BASE_PATH = '/' as const;
const LANGUAGE_QUERY_PARAM = 'lang' as const;
const ENGLISH_LANGUAGE = 'en' as const;
const SHELL_ACTIONS_SELECTOR = '.shell-actions__button' as const;
const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;
const PIXEL_DIFF_THRESHOLD = 0;

const buildPath = (routeSegment: string, queryParams: QueryParams = {}): string => {
  const normalizedRoute = routeSegment.length ? `${BASE_PATH}${routeSegment}` : BASE_PATH;
  const entries = Object.entries(queryParams).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return normalizedRoute;
  }
  const searchParams = new URLSearchParams(entries as [string, string][]);
  return `${normalizedRoute}?${searchParams.toString()}`;
};

const createScenario = (
  name: string,
  routeSegment: string,
  queryParams?: QueryParams,
  readySelector: string = SHELL_ACTIONS_SELECTOR
): SnapshotScenario => ({
  name,
  path: buildPath(routeSegment, queryParams),
  readySelector
});

describe('Visual regression', () => {
  const specName = Cypress.spec.name;
  const scenarios: readonly SnapshotScenario[] = [
    createScenario(HOME_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.home),
    createScenario(HOME_LAYOUT_EN_SNAPSHOT, APP_CONFIG.routes.home, {
      [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
    }),
    createScenario(FAVORITES_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.favorites),
    createScenario(FAVORITES_LAYOUT_EN_SNAPSHOT, APP_CONFIG.routes.favorites, {
      [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
    }),
    createScenario(ROUTE_SEARCH_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.routeSearch, undefined, ROUTE_SEARCH_SELECTOR),
    createScenario(
      ROUTE_SEARCH_LAYOUT_EN_SNAPSHOT,
      APP_CONFIG.routes.routeSearch,
      {
        [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
      },
      ROUTE_SEARCH_SELECTOR
    )
  ];

  const captureAndAssert = ({ name, path, readySelector }: SnapshotScenario) => {
    cy.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    cy.visit(path);
    cy.get(readySelector).should('be.visible');
    cy.screenshot(name, { capture: 'viewport', overwrite: true });
    cy.task<CompareSnapshotResult>('compareSnapshot', {
      specName,
      snapshotName: name,
      threshold: PIXEL_DIFF_THRESHOLD
    }).then((result) => {
      expect(result.diffPixels).to.equal(PIXEL_DIFF_THRESHOLD);
    });
  };

  scenarios.forEach((scenario) => {
    it(`matches baseline for ${scenario.name}`, () => {
      captureAndAssert(scenario);
    });
  });
});
