import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RouteLineCoordinate, RouteLineStop } from '@data/route-search/route-lines-api.service';
import {
  LeafletMapService,
  MapCreateOptions,
  MapHandle,
  MapRoutePolyline,
  MapStopInteractionOptions,
  MapStopMarker,
  MapViewportSettledHandler
} from '@shared/map/leaflet-map.service';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';

class MapHandleStub implements MapHandle {
  readonly highlightStop = jasmine.createSpy('highlightStop');
  readonly fitToCoordinates = jasmine.createSpy('fitToCoordinates');
  readonly renderRoutes = jasmine.createSpy('renderRoutes');
  readonly invalidateSize = jasmine.createSpy('invalidateSize');
  readonly destroy = jasmine.createSpy('destroy');
  readonly setView = jasmine.createSpy('setView');
  readonly renderUserLocation = jasmine.createSpy('renderUserLocation');
  readonly restrictToCoordinates = jasmine.createSpy('restrictToCoordinates');
  readonly focusStop = jasmine.createSpy('focusStop').and.returnValue(true);

  renderedStops: readonly MapStopMarker[] = [];
  interactions: MapStopInteractionOptions | undefined;

  renderStops(
    stops: readonly MapStopMarker[],
    interactions?: MapStopInteractionOptions
  ): void {
    this.renderedStops = stops;
    this.interactions = interactions;
  }

  onViewportSettled(_handler: MapViewportSettledHandler): () => void {
    return () => undefined;
  }
}

class LeafletMapServiceStub {
  readonly handle = new MapHandleStub();
  readonly create = jasmine
    .createSpy<(container: HTMLElement, options: MapCreateOptions) => MapHandle>('create')
    .and.callFake(() => this.handle);
}

const coordinates: readonly RouteLineCoordinate[] = [
  { latitude: 37.1, longitude: -5.9 },
  { latitude: 37.2, longitude: -5.8 }
];

const stops: readonly RouteLineStop[] = [
  {
    stopId: 'stop-a',
    lineId: 'line-1',
    direction: 0,
    order: 1,
    nucleusId: 'nucleus-a',
    zoneId: null,
    latitude: 37.1,
    longitude: -5.9,
    name: 'Stop A'
  },
  {
    stopId: 'stop-b',
    lineId: 'line-1',
    direction: 0,
    order: 2,
    nucleusId: 'nucleus-b',
    zoneId: null,
    latitude: 37.2,
    longitude: -5.8,
    name: 'Stop B'
  }
];

describe('RouteMapComponent', () => {
  let fixture: ComponentFixture<RouteMapComponent>;
  let maps: LeafletMapServiceStub;

  beforeEach(async () => {
    maps = new LeafletMapServiceStub();

    await TestBed.configureTestingModule({
      imports: [RouteMapComponent],
      providers: [{ provide: LeafletMapService, useValue: maps }]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteMapComponent);
    fixture.componentRef.setInput('routeId', 'line-1');
    fixture.componentRef.setInput('coordinates', coordinates);
    fixture.componentRef.setInput('stops', stops);
    fixture.detectChanges();
  });

  it('renders one canonical route and its stop markers', () => {
    expect(maps.create).toHaveBeenCalledTimes(1);
    expect(maps.handle.renderedStops.map((stop) => stop.id)).toEqual(['stop-a', 'stop-b']);
    expect(maps.handle.renderRoutes).toHaveBeenCalledWith(
      [{ id: 'line-1', coordinates }] satisfies readonly MapRoutePolyline[],
      'line-1'
    );
    expect(maps.handle.fitToCoordinates).toHaveBeenCalledWith(coordinates);
  });

  it('emits marker selection without forcing stop-detail navigation', () => {
    const selectedStopIds: string[] = [];
    fixture.componentInstance.stopSelected.subscribe((stopId) => {
      selectedStopIds.push(stopId);
    });

    maps.handle.interactions?.onSelect?.('stop-b');

    expect(selectedStopIds).toEqual(['stop-b']);
  });

  it('emits the marker details action separately from selection', () => {
    const detailsStopIds: string[] = [];
    fixture.componentInstance.stopDetails.subscribe((stopId) => {
      detailsStopIds.push(stopId);
    });

    maps.handle.interactions?.onDetails('stop-a');

    expect(detailsStopIds).toEqual(['stop-a']);
  });

  it('highlights a list-selected stop without refitting the route', () => {
    maps.handle.highlightStop.calls.reset();
    maps.handle.fitToCoordinates.calls.reset();

    fixture.componentRef.setInput('selectedStopId', 'stop-b');
    fixture.detectChanges();

    expect(maps.handle.highlightStop).toHaveBeenCalledOnceWith('stop-b');
    expect(maps.handle.fitToCoordinates).not.toHaveBeenCalled();
  });

  it('keeps the stop list usable when route geometry is unavailable', () => {
    maps.handle.renderRoutes.calls.reset();
    maps.handle.fitToCoordinates.calls.reset();

    fixture.componentRef.setInput('coordinates', []);
    fixture.detectChanges();

    expect(maps.handle.renderRoutes).toHaveBeenCalledWith([], null);
    expect(maps.handle.fitToCoordinates).toHaveBeenCalledWith([
      { latitude: 37.1, longitude: -5.9 },
      { latitude: 37.2, longitude: -5.8 }
    ]);
  });
});