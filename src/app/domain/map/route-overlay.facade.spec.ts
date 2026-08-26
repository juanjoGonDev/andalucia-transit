import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subscription, of, throwError } from 'rxjs';
import {
  RouteLineDetail,
  RouteLineStop,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import { RouteOverlayFacade, RouteOverlayState } from '@domain/map/route-overlay.facade';
import {
  RouteSearchLineMatch,
  RouteSearchSelection,
  RouteSearchStateService
} from '@domain/route-search/route-search-state.service';
import { calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

class RouteSearchStateServiceStub {
  private readonly subject = new BehaviorSubject<RouteSearchSelection | null>(null);
  readonly selection$ = this.subject.asObservable();

  emit(selection: RouteSearchSelection | null): void {
    this.subject.next(selection);
  }
}

type CoordinateTuple = readonly [number, number];

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
const ORIGIN_COORDINATE: CoordinateTuple = [37.389092, -5.984459];
const MID_COORDINATE: CoordinateTuple = [37.4, -5.99];
const DESTINATION_COORDINATE: CoordinateTuple = [37.41, -5.995];
const ALTERNATE_MID_COORDINATE_A: CoordinateTuple = [37.36, -5.95];
const ALTERNATE_MID_COORDINATE_B: CoordinateTuple = [37.43, -5.965];
const CURVE_POINT_A: CoordinateTuple = [37.394, -5.987];
const CURVE_POINT_B: CoordinateTuple = [37.404, -5.993];
const BASE_ROUTE_COORDINATES: readonly CoordinateTuple[] = [
  ORIGIN_COORDINATE,
  MID_COORDINATE,
  DESTINATION_COORDINATE
] as const;
const ALTERNATE_ROUTE_COORDINATES: readonly CoordinateTuple[] = [
  ORIGIN_COORDINATE,
  ALTERNATE_MID_COORDINATE_A,
  ALTERNATE_MID_COORDINATE_B,
  DESTINATION_COORDINATE
] as const;
const TIE_ROUTE_COORDINATES: readonly CoordinateTuple[] = [
  ORIGIN_COORDINATE,
  MID_COORDINATE,
  MID_COORDINATE,
  DESTINATION_COORDINATE
] as const;
const CURVED_OFFICIAL_COORDINATES: readonly CoordinateTuple[] = [
  ORIGIN_COORDINATE,
  CURVE_POINT_A,
  CURVE_POINT_B,
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
const EXPECTED_CURVED_ROUTE_LENGTH_METERS = calculateExpectedLengthFromCoordinates(
  CURVED_OFFICIAL_COORDINATES
);

function calculateExpectedLengthFromCoordinates(coordinates: readonly CoordinateTuple[]): number {
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

  return lengthInMeters;
}

describe('RouteOverlayFacade', () => {
  let facade: RouteOverlayFacade;
  let routeLines: jasmine.SpyObj<RouteLinesApiService>;
  let state: RouteSearchStateServiceStub;

  beforeEach(() => {
    routeLines = jasmine.createSpyObj<RouteLinesApiService>('RouteLinesApiService', [
      'getLineStops',
      'getLineDetail'
    ]);
    routeLines.getLineDetail.and.callFake((_consortiumId: number, lineId: string) =>
      of(createLineDetail(lineId))
    );
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

  it('loads official route overlays for the active selection and caches the result', () => {
    routeLines.getLineStops.and.returnValue(of(createStops()));
    const selection = createSelection();
    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(selection);

    expect(routeLines.getLineStops).toHaveBeenCalledTimes(1);
    expect(routeLines.getLineDetail).toHaveBeenCalledTimes(1);
    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes.length).toBe(1);
    expect(received.at(-1)?.routes.at(0)?.lengthInMeters).toBeCloseTo(
      EXPECTED_ROUTE_LENGTH_METERS,
      6
    );
    expect(received.at(-1)?.routes.at(0)?.lineCode).toBe(LINE_CODE);

    routeLines.getLineStops.calls.reset();
    routeLines.getLineDetail.calls.reset();
    state.emit(createSelection());

    expect(routeLines.getLineStops).not.toHaveBeenCalled();
    expect(routeLines.getLineDetail).not.toHaveBeenCalled();
    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes.length).toBe(1);

    subscription.unsubscribe();
  });

  it('uses official intermediate geometry while keeping stop count as a stop metric', () => {
    routeLines.getLineStops.and.returnValue(of(createStops()));
    routeLines.getLineDetail.and.returnValue(
      of(createLineDetail(LINE_IDENTIFIER, CURVED_OFFICIAL_COORDINATES))
    );
    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(createSelection());

    const route = received.at(-1)?.routes.at(0);
    expect(routeLines.getLineDetail).toHaveBeenCalledOnceWith(CONSORTIUM_ID, LINE_IDENTIFIER);
    expect(route?.coordinates).toEqual(
      CURVED_OFFICIAL_COORDINATES.map(([latitude, longitude]) => ({ latitude, longitude }))
    );
    expect(route?.coordinates.length).toBe(4);
    expect(route?.stopCount).toBe(3);
    expect(route?.lengthInMeters).toBeCloseTo(EXPECTED_CURVED_ROUTE_LENGTH_METERS, 6);

    subscription.unsubscribe();
  });

  it('does not fall back to straight stop segments when official geometry is absent', () => {
    routeLines.getLineStops.and.returnValue(of(createStops()));
    routeLines.getLineDetail.and.returnValue(of(createLineDetail(LINE_IDENTIFIER, [])));
    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(createSelection());

    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes).toEqual([]);

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
    expect(routeLines.getLineDetail).toHaveBeenCalledTimes(1);

    routeLines.getLineStops.calls.reset();
    routeLines.getLineDetail.calls.reset();
    facade.refresh();

    expect(routeLines.getLineStops).toHaveBeenCalledTimes(1);
    expect(routeLines.getLineDetail).toHaveBeenCalledTimes(1);
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

  it('returns an error state when the official line detail request fails', () => {
    routeLines.getLineStops.and.returnValue(of(createStops()));
    routeLines.getLineDetail.and.returnValue(throwError(() => new Error('failure')));
    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(createSelection());

    expect(routeLines.getLineDetail).toHaveBeenCalled();
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
    expect(routeLines.getLineDetail).not.toHaveBeenCalled();
    expect(received.at(-1)?.status).toBe('ready');
    expect(received.at(-1)?.routes.length).toBe(0);

    subscription.unsubscribe();
  });

  it('ignores refresh requests when no selection has been loaded', () => {
    facade.refresh();

    expect(routeLines.getLineStops).not.toHaveBeenCalled();
    expect(routeLines.getLineDetail).not.toHaveBeenCalled();
  });

  it('orders routes by length, stop count, and stable identifiers', () => {
    routeLines.getLineStops.and.callFake((_consortiumId: number, lineId: string) => {
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
    const received: RouteOverlayState[] = [];
    const subscription = facade.watchOverlay().subscribe((overlayState) => {
      received.push(overlayState);
    });

    state.emit(createSelection(matches));

    const readyState = received.find((overlayState) => overlayState.status === 'ready');
    expect(readyState).toBeDefined();
    expect(readyState!.routes.map((route) => route.id)).toEqual([
      buildExpectedRouteId(matches[1]!),
      buildExpectedRouteId(matches[2]!),
      buildExpectedRouteId(matches[0]!)
    ]);
    expect(readyState!.routes[0]!.lengthInMeters).toBeCloseTo(
      EXPECTED_ROUTE_LENGTH_METERS,
      6
    );
    expect(readyState!.routes[1]!.lengthInMeters).toBeCloseTo(
      EXPECTED_TIE_ROUTE_LENGTH_METERS,
      6
    );
    expect(readyState!.routes[0]!.stopCount).toBeLessThan(readyState!.routes[1]!.stopCount);
    expect(readyState!.routes[2]!.lengthInMeters).toBeCloseTo(
      EXPECTED_ALTERNATE_ROUTE_LENGTH_METERS,
      6
    );

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
  return createStopsForLine(LINE_IDENTIFIER, LINE_DIRECTION, BASE_ROUTE_COORDINATES, [
    ORIGIN_STOP_ID,
    MID_STOP_ID,
    DESTINATION_STOP_ID
  ]);
}

function createAlternateStops(): readonly RouteLineStop[] {
  return createStopsForLine(
    LINE_IDENTIFIER_ALTERNATE,
    LINE_DIRECTION_ALTERNATE,
    ALTERNATE_ROUTE_COORDINATES,
    [
      ORIGIN_STOP_ID,
      ALTERNATE_MID_STOP_A_ID,
      ALTERNATE_MID_STOP_B_ID,
      DESTINATION_STOP_ID
    ]
  );
}

function createTieStops(): readonly RouteLineStop[] {
  return createStopsForLine(LINE_IDENTIFIER_TIE, LINE_DIRECTION_TIE, TIE_ROUTE_COORDINATES, [
    ORIGIN_STOP_ID,
    MID_STOP_ID,
    TIE_ADDITIONAL_STOP_ID,
    DESTINATION_STOP_ID
  ]);
}

function createStopsForLine(
  lineId: string,
  direction: number,
  coordinates: readonly CoordinateTuple[],
  stopIds: readonly string[]
): readonly RouteLineStop[] {
  const stops = coordinates.map(([latitude, longitude], index) =>
    createStop(lineId, stopIds[index]!, direction, index + 1, latitude, longitude)
  );
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

function createLineDetail(
  lineId: string,
  coordinates: readonly CoordinateTuple[] = getCoordinatesForLine(lineId)
): RouteLineDetail {
  return {
    lineId,
    code: getLineCode(lineId),
    name: `${lineId}-name`,
    mode: 'bus',
    coordinates: Object.freeze(
      coordinates.map(([latitude, longitude]) => ({ latitude, longitude }))
    )
  } satisfies RouteLineDetail;
}

function getCoordinatesForLine(lineId: string): readonly CoordinateTuple[] {
  switch (lineId) {
    case LINE_IDENTIFIER:
      return BASE_ROUTE_COORDINATES;
    case LINE_IDENTIFIER_ALTERNATE:
      return ALTERNATE_ROUTE_COORDINATES;
    case LINE_IDENTIFIER_TIE:
      return TIE_ROUTE_COORDINATES;
    default:
      throw new Error(`Unexpected line identifier: ${lineId}`);
  }
}

function getLineCode(lineId: string): string {
  switch (lineId) {
    case LINE_IDENTIFIER:
      return LINE_CODE;
    case LINE_IDENTIFIER_ALTERNATE:
      return LINE_CODE_ALTERNATE;
    case LINE_IDENTIFIER_TIE:
      return LINE_CODE_TIE;
    default:
      throw new Error(`Unexpected line identifier: ${lineId}`);
  }
}

function buildExpectedRouteId(match: RouteSearchLineMatch): string {
  const originKey = [...match.originStopIds].sort().join(',');
  const destinationKey = [...match.destinationStopIds].sort().join(',');
  return [match.lineId, match.direction, originKey, destinationKey].join('|');
}
