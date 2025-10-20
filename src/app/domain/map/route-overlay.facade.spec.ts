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
const ORIGIN_ID = 'origin-stop-id' as const;
const DESTINATION_ID = 'destination-stop-id' as const;
const ORIGIN_STOP_ID = 'origin-stop' as const;
const DESTINATION_STOP_ID = 'destination-stop' as const;
const MID_STOP_ID = 'mid-stop' as const;
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
const ROUTE_ERROR_KEY = 'map.routes.error' as const;
const QUERY_DATE = new Date('2025-10-19T00:00:00Z');
const ORIGIN_COORDINATE: [number, number] = [37.389092, -5.984459];
const MID_COORDINATE: [number, number] = [37.4, -5.99];
const DESTINATION_COORDINATE: [number, number] = [37.41, -5.995];
const EXPECTED_ROUTE_LENGTH_METERS = Math.round(
  calculateDistanceInMeters(
    { latitude: ORIGIN_COORDINATE[0], longitude: ORIGIN_COORDINATE[1] },
    { latitude: MID_COORDINATE[0], longitude: MID_COORDINATE[1] }
  ) +
    calculateDistanceInMeters(
      { latitude: MID_COORDINATE[0], longitude: MID_COORDINATE[1] },
      { latitude: DESTINATION_COORDINATE[0], longitude: DESTINATION_COORDINATE[1] }
    )
);

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
});

function createSelection(): RouteSearchSelection {
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
    lineMatches: [createLineMatch()]
  } satisfies RouteSearchSelection;
}

function createLineMatch(): RouteSearchLineMatch {
  return {
    lineId: LINE_IDENTIFIER,
    lineCode: LINE_CODE,
    direction: LINE_DIRECTION,
    originStopIds: [ORIGIN_STOP_ID],
    destinationStopIds: [DESTINATION_STOP_ID]
  } satisfies RouteSearchLineMatch;
}

function createStops(): readonly RouteLineStop[] {
  const stops: RouteLineStop[] = [
    createStop(ORIGIN_STOP_ID, LINE_DIRECTION, 1, ORIGIN_COORDINATE[0], ORIGIN_COORDINATE[1]),
    createStop(MID_STOP_ID, LINE_DIRECTION, 2, MID_COORDINATE[0], MID_COORDINATE[1]),
    createStop(
      DESTINATION_STOP_ID,
      LINE_DIRECTION,
      3,
      DESTINATION_COORDINATE[0],
      DESTINATION_COORDINATE[1]
    )
  ];
  return Object.freeze(stops.map((stop) => ({ ...stop })));
}

function createStop(
  stopId: string,
  direction: number,
  order: number,
  latitude: number,
  longitude: number
): RouteLineStop {
  return {
    stopId,
    lineId: LINE_IDENTIFIER,
    direction,
    order,
    nucleusId: 'nucleus',
    zoneId: null,
    latitude,
    longitude,
    name: `${stopId}-name`
  } satisfies RouteLineStop;
}
