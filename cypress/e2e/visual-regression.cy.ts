interface CompareSnapshotResult {
  readonly diffPixels: number;
  readonly diffPath: string;
  readonly baselineCreated: boolean;
}

import { APP_CONFIG } from '../../src/app/core/config';

type SnapshotScenario = {
  readonly name: string;
  readonly path: string;
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

const createScenario = (name: string, routeSegment: string, queryParams?: QueryParams): SnapshotScenario => ({
  name,
  path: buildPath(routeSegment, queryParams)
});

describe('Visual regression', () => {
  const specName = Cypress.spec.name;
  const scenarios: readonly SnapshotScenario[] = [
    createScenario('home-layout-es', APP_CONFIG.routes.home),
    createScenario('home-layout-en', APP_CONFIG.routes.home, {
      [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
    }),
    createScenario('favorites-layout-es', APP_CONFIG.routes.favorites),
    createScenario('favorites-layout-en', APP_CONFIG.routes.favorites, {
      [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
    })
  ];

  const captureAndAssert = ({ name, path }: SnapshotScenario) => {
    cy.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    cy.visit(path);
    cy.get(SHELL_ACTIONS_SELECTOR).should('be.visible');
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
