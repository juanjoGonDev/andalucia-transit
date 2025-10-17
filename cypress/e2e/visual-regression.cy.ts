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
const SETTINGS_LAYOUT_ES_SNAPSHOT = 'settings-layout-es' as const;
const SETTINGS_LAYOUT_EN_SNAPSHOT = 'settings-layout-en' as const;
const ROUTE_SEARCH_LAYOUT_ES_SNAPSHOT = 'route-search-layout-es' as const;
const ROUTE_SEARCH_LAYOUT_EN_SNAPSHOT = 'route-search-layout-en' as const;
const MAP_LAYOUT_ES_SNAPSHOT = 'map-layout-es' as const;
const MAP_LAYOUT_EN_SNAPSHOT = 'map-layout-en' as const;
const STOP_DETAIL_LAYOUT_ES_SNAPSHOT = 'stop-detail-layout-es' as const;
const STOP_DETAIL_LAYOUT_EN_SNAPSHOT = 'stop-detail-layout-en' as const;
const ROUTE_SEARCH_SELECTOR = '.route-search' as const;
const STOP_DETAIL_SELECTOR = '.stop-detail' as const;
const SETTINGS_SELECTOR = '.settings' as const;
const MAP_SELECTOR = '.map' as const;
const STOP_DIRECTORY_INDEX_MATCHER = '**/assets/data/stop-directory/index.json' as const;
const STOP_DIRECTORY_CHUNK_ID = 'sample-chunk' as const;
const STOP_DIRECTORY_CHUNK_MATCHER =
  `**/assets/data/stop-directory/chunks/${STOP_DIRECTORY_CHUNK_ID}.json` as const;
const STOP_SERVICES_SNAPSHOT_MATCHER = '**/assets/data/snapshots/stop-services/latest.json' as const;
const STOP_DIRECTORY_INDEX_FIXTURE = 'visual-regression/stop-directory-index.json' as const;
const STOP_DIRECTORY_CHUNK_FIXTURE = 'visual-regression/stop-directory-chunk.json' as const;
const STOP_SCHEDULE_SNAPSHOT_FIXTURE = 'visual-regression/stop-schedule-snapshot.json' as const;
const STOP_DETAIL_SAMPLE_STOP_ID = '4101' as const;
const FIXED_CURRENT_TIME = Date.parse('2024-05-01T12:00:00.000Z');
const RUNTIME_FLAGS_PROPERTY = APP_CONFIG.runtime.flagsProperty;

type VisitHandler = (win: Window) => void;

type SnapshotScenario = {
  readonly name: string;
  readonly path: string;
  readonly readySelector: string;
  readonly clockTime?: number;
  readonly onBeforeVisit?: VisitHandler;
};

type QueryParams = Record<string, string | undefined>;

const BASE_PATH = '/' as const;
const LANGUAGE_QUERY_PARAM = 'lang' as const;
const ENGLISH_LANGUAGE = 'en' as const;
const SHELL_ACTIONS_SELECTOR = '.shell-actions__button' as const;
const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;
const PIXEL_DIFF_THRESHOLD = 0;

type ScenarioOptions = {
  readonly queryParams?: QueryParams;
  readonly readySelector?: string;
  readonly clockTime?: number;
  readonly onBeforeVisit?: VisitHandler;
};

type MutableWindow = Window & Record<string, unknown>;

const buildStopDetailRouteSegment = (stopId: string): string =>
  `${APP_CONFIG.routes.stopDetailBase}/${stopId}`;

const enableSnapshotMode = (win: Window): void => {
  (win as MutableWindow)[RUNTIME_FLAGS_PROPERTY] = { forceSnapshot: true };
};

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
  options: ScenarioOptions = {}
): SnapshotScenario => ({
  name,
  path: buildPath(routeSegment, options.queryParams),
  readySelector: options.readySelector ?? SHELL_ACTIONS_SELECTOR,
  clockTime: options.clockTime,
  onBeforeVisit: options.onBeforeVisit
});

describe('Visual regression', () => {
  const specName = Cypress.spec.name;
  beforeEach(() => {
    cy.intercept('GET', STOP_DIRECTORY_INDEX_MATCHER, {
      fixture: STOP_DIRECTORY_INDEX_FIXTURE
    });
    cy.intercept('GET', STOP_DIRECTORY_CHUNK_MATCHER, {
      fixture: STOP_DIRECTORY_CHUNK_FIXTURE
    });
    cy.intercept('GET', STOP_SERVICES_SNAPSHOT_MATCHER, {
      fixture: STOP_SCHEDULE_SNAPSHOT_FIXTURE
    });
  });
  const scenarios: readonly SnapshotScenario[] = [
    createScenario(HOME_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.home),
    createScenario(HOME_LAYOUT_EN_SNAPSHOT, APP_CONFIG.routes.home, {
      queryParams: {
        [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
      }
    }),
    createScenario(FAVORITES_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.favorites),
    createScenario(FAVORITES_LAYOUT_EN_SNAPSHOT, APP_CONFIG.routes.favorites, {
      queryParams: {
        [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
      }
    }),
    createScenario(SETTINGS_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.settings, {
      readySelector: SETTINGS_SELECTOR
    }),
    createScenario(
      SETTINGS_LAYOUT_EN_SNAPSHOT,
      APP_CONFIG.routes.settings,
      {
        queryParams: {
          [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
        },
        readySelector: SETTINGS_SELECTOR
      }
    ),
    createScenario(ROUTE_SEARCH_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.routeSearch, {
      readySelector: ROUTE_SEARCH_SELECTOR
    }),
    createScenario(
      ROUTE_SEARCH_LAYOUT_EN_SNAPSHOT,
      APP_CONFIG.routes.routeSearch,
      {
        queryParams: {
          [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
        },
        readySelector: ROUTE_SEARCH_SELECTOR
      }
    ),
    createScenario(MAP_LAYOUT_ES_SNAPSHOT, APP_CONFIG.routes.map, {
      readySelector: MAP_SELECTOR
    }),
    createScenario(
      MAP_LAYOUT_EN_SNAPSHOT,
      APP_CONFIG.routes.map,
      {
        queryParams: {
          [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
        },
        readySelector: MAP_SELECTOR
      }
    ),
    createScenario(
      STOP_DETAIL_LAYOUT_ES_SNAPSHOT,
      buildStopDetailRouteSegment(STOP_DETAIL_SAMPLE_STOP_ID),
      {
        readySelector: STOP_DETAIL_SELECTOR,
        clockTime: FIXED_CURRENT_TIME,
        onBeforeVisit: enableSnapshotMode
      }
    ),
    createScenario(
      STOP_DETAIL_LAYOUT_EN_SNAPSHOT,
      buildStopDetailRouteSegment(STOP_DETAIL_SAMPLE_STOP_ID),
      {
        queryParams: {
          [LANGUAGE_QUERY_PARAM]: ENGLISH_LANGUAGE
        },
        readySelector: STOP_DETAIL_SELECTOR,
        clockTime: FIXED_CURRENT_TIME,
        onBeforeVisit: enableSnapshotMode
      }
    )
  ];

  const captureAndAssert = ({
    name,
    path,
    readySelector,
    clockTime,
    onBeforeVisit
  }: SnapshotScenario) => {
    cy.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    if (typeof clockTime === 'number') {
      cy.clock(clockTime);
    }
    if (onBeforeVisit) {
      cy.visit(path, {
        onBeforeLoad: onBeforeVisit
      });
    } else {
      cy.visit(path);
    }
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
