import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import type {
  RouteLineCoordinate,
  RouteLineStop,
} from '@data/route-search/route-lines-api.service';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import { LeafletMapService, MapHandle, MapStopMarker } from '@shared/map/leaflet-map.service';
import { MapStopMarkerRole } from '@shared/map/map-marker-style';

const DEFAULT_CENTER = { latitude: 37.3891, longitude: -4.7794 } as const;
const DEFAULT_ZOOM = 7;
const USER_FOCUS_ZOOM = 16;

@Component({
  selector: 'app-route-map',
  standalone: true,
  templateUrl: './route-map.component.html',
  styleUrl: './route-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private mapContainer?: ElementRef<HTMLElement>;

  @Input() routeId = 'route';
  @Input() coordinates: readonly RouteLineCoordinate[] = [];
  @Input() stops: readonly RouteLineStop[] = [];
  @Input() originStopIds: readonly string[] = [];
  @Input() destinationStopIds: readonly string[] = [];
  @Input() selectedStopId: string | null = null;
  @Input() userPosition: GeoCoordinate | null = null;
  @Input() accessibleLabel = 'Route map';
  @Input() stopDetailsLabel = 'More information';

  @Output() readonly stopSelected = new EventEmitter<string>();
  @Output() readonly stopDetails = new EventEmitter<string>();

  private readonly maps = inject(LeafletMapService);
  private handle: MapHandle | null = null;

  /** Smoothly pans the camera so the given stop is centered on the map. */
  centerStop(stopId: string): void {
    this.handle?.centerStop(stopId, true);
  }

  /** Flies to the live user position when one is being rendered. */
  centerOnUser(): boolean {
    if (!this.handle || !this.userPosition) {
      return false;
    }

    this.handle.setView(this.userPosition, USER_FOCUS_ZOOM, true);
    return true;
  }
  private lastDataSignature = '';

  ngAfterViewInit(): void {
    this.ensureMap();
    this.renderData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.handle) {
      return;
    }

    if (
      changes['coordinates'] ||
      changes['stops'] ||
      changes['routeId'] ||
      changes['originStopIds'] ||
      changes['destinationStopIds']
    ) {
      this.renderData();
    }

    if (changes['selectedStopId']) {
      this.handle.highlightStop(this.selectedStopId);
    }

    if (changes['userPosition'] && this.userPosition) {
      this.handle.renderUserLocation(this.userPosition);
    }
  }

  ngOnDestroy(): void {
    this.handle?.destroy();
    this.handle = null;
  }

  private ensureMap(): void {
    if (this.handle || !this.mapContainer) {
      return;
    }

    this.handle = this.maps.create(this.mapContainer.nativeElement, {
      center: this.resolveCenter(),
      zoom: DEFAULT_ZOOM,
    });
  }

  private renderData(): void {
    this.ensureMap();
    if (!this.handle) {
      return;
    }

    const signature = buildDataSignature(
      this.routeId,
      this.coordinates,
      this.stops,
      this.originStopIds,
      this.destinationStopIds,
    );
    if (signature === this.lastDataSignature) {
      this.handle.highlightStop(this.selectedStopId);
      return;
    }
    this.lastDataSignature = signature;

    const markers = this.stops.map((stop) =>
      toMapStopMarker(stop, resolveMarkerRole(stop, this.originStopIds, this.destinationStopIds)),
    );
    this.handle.renderStops(markers, {
      getDetailsLabel: () => this.stopDetailsLabel,
      onSelect: (stopId) => this.stopSelected.emit(stopId),
      onDetails: (stopId) => this.stopDetails.emit(stopId),
    });

    if (this.coordinates.length >= 2) {
      this.handle.renderRoutes([{ id: this.routeId, coordinates: this.coordinates }], this.routeId);
    } else {
      this.handle.renderRoutes([], null);
    }

    const fitPoints =
      this.coordinates.length >= 2 ? this.coordinates : markers.map((marker) => marker.coordinate);
    this.handle.fitToCoordinates(fitPoints);
    this.handle.highlightStop(this.selectedStopId);

    if (this.userPosition) {
      this.handle.renderUserLocation(this.userPosition);
    }

    queueMicrotask(() => this.handle?.invalidateSize());
  }

  private resolveCenter(): RouteLineCoordinate {
    return (
      this.coordinates[0] ??
      (this.stops[0]
        ? { latitude: this.stops[0].latitude, longitude: this.stops[0].longitude }
        : DEFAULT_CENTER)
    );
  }
}

function toMapStopMarker(stop: RouteLineStop, role: MapStopMarkerRole): MapStopMarker {
  return {
    id: stop.stopId,
    name: stop.name,
    code: '',
    municipality: '',
    role,
    coordinate: {
      latitude: stop.latitude,
      longitude: stop.longitude,
    },
  };
}

function resolveMarkerRole(
  stop: RouteLineStop,
  originStopIds: readonly string[],
  destinationStopIds: readonly string[],
): MapStopMarkerRole {
  if (originStopIds.includes(stop.stopId)) {
    return 'origin';
  }

  if (destinationStopIds.includes(stop.stopId)) {
    return 'destination';
  }

  return 'regular';
}

function buildDataSignature(
  routeId: string,
  coordinates: readonly RouteLineCoordinate[],
  stops: readonly RouteLineStop[],
  originStopIds: readonly string[],
  destinationStopIds: readonly string[],
): string {
  const firstCoordinate = coordinates[0];
  const lastCoordinate = coordinates[coordinates.length - 1];
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  return [
    routeId,
    coordinates.length,
    firstCoordinate?.latitude ?? '',
    firstCoordinate?.longitude ?? '',
    lastCoordinate?.latitude ?? '',
    lastCoordinate?.longitude ?? '',
    stops.length,
    firstStop?.stopId ?? '',
    lastStop?.stopId ?? '',
    originStopIds.join(','),
    destinationStopIds.join(','),
  ].join('|');
}
