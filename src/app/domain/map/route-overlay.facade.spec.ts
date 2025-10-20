import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subscription, of, throwError } from 'rxjs';

import { RouteLinesApiService, RouteLineStop } from '../../data/route-search/route-lines-api.service';
import { RouteOverlayFacade, RouteOverlayState } from './route-overlay.facade';
import {
  RouteSearchLineMatch,
  RouteSearchSelection,
  RouteSearchStateService
} from '../route-search/route-search-state.service';
import { calculateDistanceInMeters } from '../utils/geo-distance.util';

class RouteSearchStateServiceStub {
  private readonly subject = new BehaviorSubject<RouteSearchSelection | null>(null);
  readonly selection$ = this.subject.asObservable();

  emit(selection: RouteSearchSelection | null): void {
    this.subject.next(selection);
  }
}

const CONSORTIUM_ID = 1;
const LINE_IDENTIFIER = 'line-1' as const;
const LINE_CODE = 'L1' as const;
const LINE_IDENTIFIER_ALTERNATE = 'line-2' as const;
const LINE_CODE_ALTERNATE = 'L2' as const;
const LINE_IDENTIFIER_TIE = 'line-3' as const;
const LINE_CODE_TIE = 'L3' as const;
const ORIGIN_ID = 'origin-stop-id' as const;
const DESTINATION_ID = 'destination-stop-id' as const;
const ORIGIN_STOP_ID = 'origin-stop' as const;
const DESTINATION_STOP_ID = 'destination-stop' as const;
const MID_STOP_ID = 'mid-stop' as const;
const ALTERNATE_MID_STOP_A_ID = 'alternate-mid-a' as const;
const ALTERNATE_MID_STOP_B_ID = 'alternate-mid-b' as const;
const TIE_ADDITIONAL_STOP_ID = 'tie-mid-extra' as const;
const ORIGIN_NAME = 'Origin' as const;
const DESTINATION_NAME = 'Destination' as const;
const ORIGIN_CODE = 'ORG' as const;
const DESTINATION_CODE = 'DST' as const;
const ORIGIN_MUNICIPALITY = 'Origin City' as const;
const DESTINATION_MUNICIPALITY = 'Destination City' as const;
const ORIGIN_NUCLEUS = 'Origin Nucleus' as const;
const DESTINATION_NUCLEUS = 'Destination Nucleus' as const;
const ORIGIN_MUNICIPALITY_ID = 'origin-municipality' as const;
const DESTINATION_MUNICIPALITY_ID = 'destination-municipality' as const;
const ORIGIN_NUCLEUS_ID = 'origin-nucleus' as const;
const DESTINATION_NUCLEUS_ID = 'destination-nucleus' as const;
const LINE_DIRECTION = 1;
const LINE_DIRECTION_ALTERNATE = 2;
const LINE_DIRECTION_TIE = 3;
const ROUTE_ERROR_KEY = 'map.routes.error' as const;
const QUERY_DATE = new Date('2025-10-19T00:00:00Z');
const ORIGIN_COORDINATE: [number, number] = [37.389092, -5.984459];
const MID_COORDINATE: [number, number] = [37.4, -5.99];
const DESTINATION_COORDINATE: [number, number] = [37.41, -5.995];
const ALTERNATE_MID_COORDINATE_A: [number, number] = [37.36, -5.95];
const ALTERNATE_MID_COORDINATE_B: [number, number] = [37.43, -5.965];
const BASE_ROUTE_COORDINATES: readonly [number, number][] = [
  ORIGIN_COORDINATE,
  MID_COORDINATE,
  DESTINATION_COORDINATE
] as const;
const ALTERNATE_ROUTE_COORDINATES: readonly [number, number][] = [
  ORIGIN_COORDINATE,
  ALTERNATE_MID_COORDINATE_A,
  ALTERNATE_MID_COORDINATE_B,
  DESTINATION_COORDINATE
] as const;
const TIE_ROUTE_COORDINATES: readonly [number, number][] = [
  ORIGIN_COORDINATE,
  MID_COORDINATE,
  MID_COORDINATE,
  DESTINATION_COORDINATE
] as const;
const EXPECTED_ROUTE_LENGTH_METERS = calculateExpectedLengthFromCoordinates(
  BASE_ROUTE_COORDINATES
);
const EXPECTED_ALTERNATE_ROUTE_LENGTH_METERS = calculateExpectedLengthFromCoordinates(
  ALTERNATE_ROUTE_COORDINATES
);
const EXPECTED_TIE_ROUTE_LENGTH_METERS = calculateExpectedLengthFromCoordinates(
  TIE_ROUTE_COORDINATES
);

function calculateExpectedLengthFromCoordinates(
  coordinates: readonly [number, number][]
): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let lengthInMeters = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1]!;
    const current = coordinates[index]!;
    lengthInMeters += calculateDistanceInMeters(
      { latitude: previous[0], longitude: previous[1] },
      { latitude: current[0], longitude: current[1] }
    );
  }

  return Math.round(lengthInMeters);
}

describe('RouteOverlayFacade', () => {
  let facade: RouteOverlayFacade;
  let routeLines: jasmine.SpyObj<RouteLinesApiService>;
  let state: RouteSearchStateServiceStub;

  beforeEach(() => {
    routeLines = jasmine.createSpyObj<RouteLinesApiService>('RouteLinesApiService', ['getLineStops']);
    state = new RouteSearchStateServiceStub();

    TestBed.configureTestingModule({
      providers: [
        RouteOverlayFacade,
        { provide: RouteLinesApiService, useValue: routeLines },
        { provide: RouteSearchStateService, useValue: state }
      ]
    });

    facade = TestBed.inject(RouteOverlayFacade);
  });

  it('emits an idle state when no selection is active', (done) => {
    let subscription: Subscription | null = null;
    subscription = facade.watchOverlay().subscribe((overlayState) => {
      expect(overlayState.status).toBe('idle');
      expect(overlayState.routes).toEqual([]);
      expect(overlayState.errorKey).toBeNull();
      expect(overlayState.selectionKey).toBeNull();
      expect(overlayState.selectionSummary).toBeNull();
      subscription?.unsubscribe();
      done();
    });
  });

  it('loads route overlays for the active selection and caches the result', () => {
    routeLines.getLineStops.and.returnValue(of(createStops()));
    const selection = createSelection();

    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(selection);

    expect(routeLines.getLineStops).toHaveBeenCalledTimes(1);
    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes.length).toBe(1);
    expect(received.at(-1)?.routes.at(0)?.lengthInMeters).toBe(EXPECTED_ROUTE_LENGTH_METERS);
    expect(received.at(-1)?.routes.at(0)?.lineCode).toBe(LINE_CODE);

    routeLines.getLineStops.calls.reset();

    state.emit(createSelection());

    expect(routeLines.getLineStops).not.toHaveBeenCalled();
    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes.length).toBe(1);

    subscription.unsubscribe();
  });

  it('refreshes cached routes when requested', () => {
    routeLines.getLineStops.and.returnValue(of(createStops()));

    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(createSelection());
    expect(routeLines.getLineStops).toHaveBeenCalledTimes(1);

    routeLines.getLineStops.calls.reset();

    facade.refresh();

    expect(routeLines.getLineStops).toHaveBeenCalledTimes(1);
    expect(received.at(-1)?.status).toBe('ready');

    subscription.unsubscribe();
  });

  it('returns an error state when the route stops request fails', () => {
    routeLines.getLineStops.and.returnValue(throwError(() => new Error('failure')));

    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(createSelection());

    expect(routeLines.getLineStops).toHaveBeenCalled();
    expect(received.at(-1)?.status).toBe('error');
    expect(received.at(-1)?.routes).toEqual([]);
    expect(received.at(-1)?.errorKey).toBe(ROUTE_ERROR_KEY);

    subscription.unsubscribe();
  });

  it('does not attempt to load routes when the selection has no matches', () => {
    const selection: RouteSearchSelection = {
      ...createSelection(),
      lineMatches: []
    };

    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(selection);

    expect(routeLines.getLineStops).not.toHaveBeenCalled();
    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes.length).toBe(0);

    subscription.unsubscribe();
  });

  it('ignores refresh requests when no selection has been loaded', () => {
    facade.refresh();

    expect(routeLines.getLineStops).not.toHaveBeenCalled();
  });

  it('orders routes by length, stop count, and stable identifiers', () => {
    routeLines.getLineStops.and.callFake((consortiumId: number, lineId: string) => {
      if (lineId === LINE_IDENTIFIER) {
        return of(createStops());
      }

      if (lineId === LINE_IDENTIFIER_TIE) {
        return of(createTieStops());
      }

      if (lineId === LINE_IDENTIFIER_ALTERNATE) {
        return of(createAlternateStops());
      }

      throw new Error(`Unexpected line identifier: ${lineId}`);
    });

    const matches: RouteSearchLineMatch[] = [
      createAlternateLineMatch(),
      createLineMatch(),
      createTieLineMatch()
    ];
    const selection = createSelection(matches);

    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(selection);

    const readyState = received.find((overlayState) => overlayState.status === 'ready');
    expect(readyState).toBeDefined();

    const routeIds = readyState!.routes.map((route) => route.id);

    expect(routeIds).toEqual([
      buildExpectedRouteId(matches[1]!),
      buildExpectedRouteId(matches[2]!),
      buildExpectedRouteId(matches[0]!)
    ]);

    expect(readyState!.routes[0]!.lengthInMeters).toBe(EXPECTED_ROUTE_LENGTH_METERS);
    expect(readyState!.routes[1]!.lengthInMeters).toBe(EXPECTED_TIE_ROUTE_LENGTH_METERS);
    expect(readyState!.routes[0]!.stopCount).toBeLessThan(readyState!.routes[1]!.stopCount);
    expect(readyState!.routes[2]!.lengthInMeters).toBe(EXPECTED_ALTERNATE_ROUTE_LENGTH_METERS);

    subscription.unsubscribe();
  });
});

function createSelection(
  matches: readonly RouteSearchLineMatch[] = [createLineMatch()]
): RouteSearchSelection {
  return {
    origin: {
      id: ORIGIN_ID,
      stopIds: [ORIGIN_STOP_ID],
      consortiumId: CONSORTIUM_ID,
      name: ORIGIN_NAME,
      code: ORIGIN_CODE,
      municipality: ORIGIN_MUNICIPALITY,
      municipalityId: ORIGIN_MUNICIPALITY_ID,
      nucleus: ORIGIN_NUCLEUS,
      nucleusId: ORIGIN_NUCLEUS_ID
    },
    destination: {
      id: DESTINATION_ID,
      stopIds: [DESTINATION_STOP_ID],
      consortiumId: CONSORTIUM_ID,
      name: DESTINATION_NAME,
      code: DESTINATION_CODE,
      municipality: DESTINATION_MUNICIPALITY,
      municipalityId: DESTINATION_MUNICIPALITY_ID,
      nucleus: DESTINATION_NUCLEUS,
      nucleusId: DESTINATION_NUCLEUS_ID
    },
    queryDate: QUERY_DATE,
    lineMatches: matches.map((match) => ({ ...match })) as readonly RouteSearchLineMatch[]
  } satisfies RouteSearchSelection;
}

function createLineMatch(): RouteSearchLineMatch {
  return createLineMatchWith(LINE_IDENTIFIER, LINE_CODE, LINE_DIRECTION);
}

function createAlternateLineMatch(): RouteSearchLineMatch {
  return createLineMatchWith(
    LINE_IDENTIFIER_ALTERNATE,
    LINE_CODE_ALTERNATE,
    LINE_DIRECTION_ALTERNATE
  );
}

function createTieLineMatch(): RouteSearchLineMatch {
  return createLineMatchWith(LINE_IDENTIFIER_TIE, LINE_CODE_TIE, LINE_DIRECTION_TIE);
}

function createLineMatchWith(
  lineId: string,
  lineCode: string,
  direction: number
): RouteSearchLineMatch {
  return {
    lineId,
    lineCode,
    direction,
    originStopIds: [ORIGIN_STOP_ID],
    destinationStopIds: [DESTINATION_STOP_ID]
  } satisfies RouteSearchLineMatch;
}

function createStops(): readonly RouteLineStop[] {
  const stops: RouteLineStop[] = [
    createStop(
      LINE_IDENTIFIER,
      ORIGIN_STOP_ID,
      LINE_DIRECTION,
      1,
      ORIGIN_COORDINATE[0],
      ORIGIN_COORDINATE[1]
    ),
    createStop(
      LINE_IDENTIFIER,
      MID_STOP_ID,
      LINE_DIRECTION,
      2,
      MID_COORDINATE[0],
      MID_COORDINATE[1]
    ),
    createStop(
      LINE_IDENTIFIER,
      DESTINATION_STOP_ID,
      LINE_DIRECTION,
      3,
      DESTINATION_COORDINATE[0],
      DESTINATION_COORDINATE[1]
    )
  ];
  return Object.freeze(stops.map((stop) => ({ ...stop })));
}

function createAlternateStops(): readonly RouteLineStop[] {
  const stops: RouteLineStop[] = [
    createStop(
      LINE_IDENTIFIER_ALTERNATE,
      ORIGIN_STOP_ID,
      LINE_DIRECTION_ALTERNATE,
      1,
      ORIGIN_COORDINATE[0],
      ORIGIN_COORDINATE[1]
    ),
    createStop(
      LINE_IDENTIFIER_ALTERNATE,
      ALTERNATE_MID_STOP_A_ID,
      LINE_DIRECTION_ALTERNATE,
      2,
      ALTERNATE_MID_COORDINATE_A[0],
      ALTERNATE_MID_COORDINATE_A[1]
    ),
    createStop(
      LINE_IDENTIFIER_ALTERNATE,
      ALTERNATE_MID_STOP_B_ID,
      LINE_DIRECTION_ALTERNATE,
      3,
      ALTERNATE_MID_COORDINATE_B[0],
      ALTERNATE_MID_COORDINATE_B[1]
    ),
    createStop(
      LINE_IDENTIFIER_ALTERNATE,
      DESTINATION_STOP_ID,
      LINE_DIRECTION_ALTERNATE,
      4,
      DESTINATION_COORDINATE[0],
      DESTINATION_COORDINATE[1]
    )
  ];
  return Object.freeze(stops.map((stop) => ({ ...stop })));
}

function createTieStops(): readonly RouteLineStop[] {
  const stops: RouteLineStop[] = [
    createStop(
      LINE_IDENTIFIER_TIE,
      ORIGIN_STOP_ID,
      LINE_DIRECTION_TIE,
      1,
      ORIGIN_COORDINATE[0],
      ORIGIN_COORDINATE[1]
    ),
    createStop(
      LINE_IDENTIFIER_TIE,
      MID_STOP_ID,
      LINE_DIRECTION_TIE,
      2,
      MID_COORDINATE[0],
      MID_COORDINATE[1]
    ),
    createStop(
      LINE_IDENTIFIER_TIE,
      TIE_ADDITIONAL_STOP_ID,
      LINE_DIRECTION_TIE,
      3,
      MID_COORDINATE[0],
      MID_COORDINATE[1]
    ),
    createStop(
      LINE_IDENTIFIER_TIE,
      DESTINATION_STOP_ID,
      LINE_DIRECTION_TIE,
      4,
      DESTINATION_COORDINATE[0],
      DESTINATION_COORDINATE[1]
    )
  ];
  return Object.freeze(stops.map((stop) => ({ ...stop })));
}

function createStop(
  lineId: string,
  stopId: string,
  direction: number,
  order: number,
  latitude: number,
  longitude: number
): RouteLineStop {
  return {
    stopId,
    lineId,
    direction,
    order,
    nucleusId: 'nucleus',
    zoneId: null,
    latitude,
    longitude,
    name: `${stopId}-name`
  } satisfies RouteLineStop;
}

function buildExpectedRouteId(match: RouteSearchLineMatch): string {
  const originKey = [...match.originStopIds].sort().join(',');
  const destinationKey = [...match.destinationStopIds].sort().join(',');
  return [match.lineId, match.direction, originKey, destinationKey].join('|');
}
