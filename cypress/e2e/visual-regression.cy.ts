import { APP_CONFIG } from '../../src/app/core/config';
import { buildMapTileResponse } from '../support/visual-regression/map-tile';
import { CompareSnapshotResult } from '../support/visual-regression/types';

const HOME_LAYOUT_SNAPSHOT_BASE = 'home-layout' as const;
const FAVORITES_LAYOUT_SNAPSHOT_BASE = 'favorites-layout' as const;
const SETTINGS_LAYOUT_SNAPSHOT_BASE = 'settings-layout' as const;
const ROUTE_SEARCH_LAYOUT_SNAPSHOT_BASE = 'route-search-layout' as const;
const MAP_LAYOUT_SNAPSHOT_BASE = 'map-layout' as const;
const STOP_DETAIL_LAYOUT_SNAPSHOT_BASE = 'stop-detail-layout' as const;
const ROUTE_SEARCH_SELECTOR = '.route-search' as const;
const STOP_DETAIL_SELECTOR = '.stop-detail' as const;
const SETTINGS_SELECTOR = '.settings' as const;
const MAP_SELECTOR = '.map' as const;
const MAP_TILE_MATCHER = '**/tile.openstreetmap.org/**' as const;
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

const LOCALE_VARIANTS = [
  { key: 'es', languageParam: undefined },
  { key: 'en', languageParam: ENGLISH_LANGUAGE }
] as const;

type LocaleKey = (typeof LOCALE_VARIANTS)[number]['key'];

type ScenarioOptions = {
  readonly queryParams?: QueryParams;
  readonly readySelector?: string;
  readonly clockTime?: number;
  readonly onBeforeVisit?: VisitHandler;
};

type MutableWindow = Window & Record<string, unknown>;

type LocalizedScenarioOverrides = Partial<Record<LocaleKey, ScenarioOptions>>;

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

const removeUndefinedQueryParams = (queryParams: QueryParams): QueryParams => {
  const sanitizedEntries = Object.entries(queryParams).filter(([, value]) => value !== undefined);
  return Object.fromEntries(sanitizedEntries) as QueryParams;
};

const buildLocalizedQueryParams = (
  baseQueryParams: QueryParams | undefined,
  localizedQueryParams: QueryParams | undefined,
  languageParam: string | undefined
): QueryParams | undefined => {
  const mergedEntries: QueryParams = {
    ...(baseQueryParams ?? {}),
    ...(localizedQueryParams ?? {})
  };
  if (languageParam !== undefined) {
    mergedEntries[LANGUAGE_QUERY_PARAM] = languageParam;
  } else {
    delete mergedEntries[LANGUAGE_QUERY_PARAM];
  }
  const sanitized = removeUndefinedQueryParams(mergedEntries);
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const createLocalizedScenarios = (
  baseName: string,
  routeSegment: string,
  baseOptions: ScenarioOptions = {},
  localeOverrides: LocalizedScenarioOverrides = {}
): readonly SnapshotScenario[] =>
  LOCALE_VARIANTS.map((locale) => {
    const localizedOptions = localeOverrides[locale.key] ?? {};
    const { queryParams: baseQueryParams, ...baseRest } = baseOptions;
    const { queryParams: localizedQueryParams, ...localizedRest } = localizedOptions;
    const combinedOptions: ScenarioOptions = {
      ...baseRest,
      ...localizedRest,
      queryParams: buildLocalizedQueryParams(
        baseQueryParams,
        localizedQueryParams,
        locale.languageParam
      )
    };
    const localizedName = `${baseName}-${locale.key}`;
    return createScenario(localizedName, routeSegment, combinedOptions);
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
    const mapTileResponse = buildMapTileResponse();
    cy.intercept('GET', MAP_TILE_MATCHER, (req) => {
      req.reply(mapTileResponse);
    });
  });
  const scenarios: readonly SnapshotScenario[] = [
    ...createLocalizedScenarios(HOME_LAYOUT_SNAPSHOT_BASE, APP_CONFIG.routes.home),
    ...createLocalizedScenarios(
      FAVORITES_LAYOUT_SNAPSHOT_BASE,
      APP_CONFIG.routes.favorites
    ),
    ...createLocalizedScenarios(
      SETTINGS_LAYOUT_SNAPSHOT_BASE,
      APP_CONFIG.routes.settings,
      {
        readySelector: SETTINGS_SELECTOR
      }
    ),
    ...createLocalizedScenarios(
      ROUTE_SEARCH_LAYOUT_SNAPSHOT_BASE,
      APP_CONFIG.routes.routeSearch,
      {
        readySelector: ROUTE_SEARCH_SELECTOR
      }
    ),
    ...createLocalizedScenarios(
      MAP_LAYOUT_SNAPSHOT_BASE,
      APP_CONFIG.routes.map,
      {
        readySelector: MAP_SELECTOR
      }
    ),
    ...createLocalizedScenarios(
      STOP_DETAIL_LAYOUT_SNAPSHOT_BASE,
      buildStopDetailRouteSegment(STOP_DETAIL_SAMPLE_STOP_ID),
      {
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
