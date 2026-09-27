import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
  readonly centerStop = jasmine.createSpy('centerStop').and.returnValue(true);
  readonly renderRoutes = jasmine.createSpy('renderRoutes');
  readonly invalidateSize = jasmine.createSpy('invalidateSize');
  readonly destroy = jasmine.createSpy('destroy');
  readonly setView = jasmine.createSpy('setView');
  readonly panTo = jasmine.createSpy('panTo');
  readonly renderUserLocation = jasmine.createSpy('renderUserLocation');
  readonly restrictToCoordinates = jasmine.createSpy('restrictToCoordinates');
  readonly focusStop = jasmine.createSpy('focusStop').and.returnValue(true);

  renderedStops: readonly MapStopMarker[] = [];
  interactions: MapStopInteractionOptions | undefined;
  userPanStartedHandler: (() => void) | null = null;

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

  onUserPanStarted(handler: () => void): () => void {
    this.userPanStartedHandler = handler;

    return () => {
      this.userPanStartedHandler = null;
    };
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

  it('traps leaflet chrome in its own stacking context so page UI can layer above it', () => {
    const mapSurface = fixture.debugElement.query(By.css('.route-map'))
      .nativeElement as HTMLElement;

    expect(getComputedStyle(mapSurface).isolation).toBe('isolate');
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

  it('centers a stop with a smooth camera animation on demand', () => {
    fixture.detectChanges();

    fixture.componentInstance.centerStop('stop-b');

    expect(maps.handle.centerStop).toHaveBeenCalledWith('stop-b', true);
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

  it('flags searched origin and destination markers with their roles', () => {
    fixture.componentRef.setInput('originStopIds', ['stop-a']);
    fixture.componentRef.setInput('destinationStopIds', ['stop-b']);
    fixture.detectChanges();

    expect(maps.handle.renderedStops.map((stop) => stop.role ?? 'regular')).toEqual([
      'origin',
      'destination'
    ]);
  });

  it('re-renders markers when only the role inputs change', () => {
    fixture.componentRef.setInput('originStopIds', ['stop-b']);
    fixture.detectChanges();

    expect(maps.handle.renderedStops.map((stop) => stop.role ?? 'regular')).toEqual([
      'regular',
      'origin'
    ]);
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

  it('only moves the user marker when following is disabled', () => {
    fixture.componentRef.setInput('userPosition', { latitude: 37.15, longitude: -5.85 });
    fixture.detectChanges();

    expect(maps.handle.renderUserLocation).toHaveBeenCalledWith({
      latitude: 37.15,
      longitude: -5.85
    });
    expect(maps.handle.setView).not.toHaveBeenCalled();
    expect(maps.handle.panTo).not.toHaveBeenCalled();
  });

  it('follows the user: first fix flies in at focus zoom, later fixes pan along', () => {
    fixture.componentRef.setInput('followUser', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('userPosition', { latitude: 37.15, longitude: -5.85 });
    fixture.detectChanges();

    expect(maps.handle.setView).toHaveBeenCalledWith(
      { latitude: 37.15, longitude: -5.85 },
      16,
      true
    );

    fixture.componentRef.setInput('userPosition', { latitude: 37.16, longitude: -5.84 });
    fixture.detectChanges();

    expect(maps.handle.panTo).toHaveBeenCalledWith({ latitude: 37.16, longitude: -5.84 }, true);
    expect(maps.handle.setView).toHaveBeenCalledTimes(1);
    expect(maps.handle.renderUserLocation).toHaveBeenCalledWith({
      latitude: 37.16,
      longitude: -5.84
    });
  });

  it('anchors the initial camera on the user instead of fitting the whole route', () => {
    fixture.componentRef.setInput('followUser', true);
    fixture.componentRef.setInput('userPosition', { latitude: 37.15, longitude: -5.85 });
    fixture.detectChanges();
    maps.handle.setView.calls.reset();
    maps.handle.fitToCoordinates.calls.reset();

    fixture.componentRef.setInput('routeId', 'line-2');
    fixture.detectChanges();

    expect(maps.handle.setView).toHaveBeenCalledWith(
      { latitude: 37.15, longitude: -5.85 },
      16,
      false
    );
    expect(maps.handle.fitToCoordinates).not.toHaveBeenCalled();
  });

  it('pauses following while the user drags the map and resumes it on recenter', () => {
    fixture.componentRef.setInput('followUser', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('userPosition', { latitude: 37.15, longitude: -5.85 });
    fixture.detectChanges();
    expect(maps.handle.setView).toHaveBeenCalledTimes(1);

    maps.handle.userPanStartedHandler?.();
    fixture.componentRef.setInput('userPosition', { latitude: 37.16, longitude: -5.84 });
    fixture.detectChanges();

    // The marker keeps updating, but the camera stays where the user left it.
    expect(maps.handle.panTo).not.toHaveBeenCalled();
    expect(maps.handle.renderUserLocation).toHaveBeenCalledWith({
      latitude: 37.16,
      longitude: -5.84
    });

    fixture.componentInstance.centerOnUser();
    fixture.componentRef.setInput('userPosition', { latitude: 37.17, longitude: -5.83 });
    fixture.detectChanges();

    expect(maps.handle.setView).toHaveBeenCalledWith(
      { latitude: 37.16, longitude: -5.84 },
      16,
      true
    );
    expect(maps.handle.panTo).toHaveBeenCalledWith({ latitude: 37.17, longitude: -5.83 }, true);
  });

  it('pauses following while a stop popup is open so it does not fight the camera', () => {
    fixture.componentRef.setInput('followUser', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('userPosition', { latitude: 37.15, longitude: -5.85 });
    fixture.detectChanges();
    expect(maps.handle.setView).toHaveBeenCalledTimes(1);

    maps.handle.interactions?.onSelect?.('stop-b');
    fixture.componentRef.setInput('userPosition', { latitude: 37.16, longitude: -5.84 });
    fixture.detectChanges();

    expect(maps.handle.panTo).not.toHaveBeenCalled();
  });
});