import { Injectable } from '@angular/core';
import {
  CircleMarker,
  LatLngBounds,
  LatLngExpression,
  LineCapShape,
  LineJoinShape,
  Map,
  Polyline,
  PolylineOptions,
  circleMarker,
  layerGroup,
  latLngBounds,
  map as createMap,
  polyline,
  tileLayer
} from 'leaflet';

import { GeoCoordinate } from '../../domain/utils/geo-distance.util';

export interface MapCreateOptions {
  readonly center: GeoCoordinate;
  readonly zoom: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

export interface MapStopMarker {
  readonly id: string;
  readonly coordinate: GeoCoordinate;
}

export interface MapHandle {
  setView(center: GeoCoordinate, zoom: number): void;
  renderUserLocation(coordinate: GeoCoordinate): void;
  renderStops(stops: readonly MapStopMarker[]): void;
  fitToCoordinates(points: readonly GeoCoordinate[]): void;
  renderRoutes(routes: readonly MapRoutePolyline[], activeRouteId: string | null): void;
  invalidateSize(): void;
  destroy(): void;
}

export interface MapRoutePolyline {
  readonly id: string;
  readonly coordinates: readonly GeoCoordinate[];
}

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' as const;
const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' as const;
const DEFAULT_MIN_ZOOM = 6;
const DEFAULT_MAX_ZOOM = 17;
const MAP_PADDING: [number, number] = [32, 32];
const STOP_MARKER_RADIUS = 7;
const STOP_MARKER_COLOR = 'var(--color-primary)' as const;
const STOP_MARKER_STROKE_COLOR = 'var(--color-primary-midnight)' as const;
const STOP_MARKER_FILL_OPACITY = 0.85;
const STOP_MARKER_WEIGHT = 2;
const USER_MARKER_RADIUS = 10;
const USER_MARKER_COLOR = 'var(--color-warning)' as const;
const USER_MARKER_STROKE_COLOR = 'var(--color-secondary)' as const;
const USER_MARKER_FILL_OPACITY = 0.9;
const USER_MARKER_WEIGHT = 3;
const ROUTE_POLYLINE_COLOR = 'var(--color-primary-midnight)' as const;
const ROUTE_POLYLINE_HIGHLIGHT_COLOR = 'var(--color-secondary)' as const;
const ROUTE_POLYLINE_WEIGHT = 4;
const ROUTE_POLYLINE_HIGHLIGHT_WEIGHT = 6;
const ROUTE_POLYLINE_OPACITY = 0.85;
const ROUTE_POLYLINE_HIGHLIGHT_OPACITY = 1;
const ROUTE_POLYLINE_LINE_JOIN: LineJoinShape = 'round';
const ROUTE_POLYLINE_LINE_CAP: LineCapShape = 'round';

@Injectable({ providedIn: 'root' })
export class LeafletMapService {
  create(container: HTMLElement, options: MapCreateOptions): MapHandle {
    const map = this.buildMap(container, options);
    const stopsLayer = layerGroup().addTo(map);
    let userMarker: CircleMarker | null = null;
    const routeLayer = layerGroup().addTo(map);
    const routePolylines = new globalThis.Map<string, Polyline>();

    return {
      setView: (center, zoom) => {
        map.setView(this.toLatLng(center), zoom);
      },
      renderUserLocation: (coordinate) => {
        const latLng = this.toLatLng(coordinate);

        if (userMarker) {
          userMarker.setLatLng(latLng);
          return;
        }

        userMarker = circleMarker(latLng, {
          radius: USER_MARKER_RADIUS,
          color: USER_MARKER_STROKE_COLOR,
          weight: USER_MARKER_WEIGHT,
          fillColor: USER_MARKER_COLOR,
          fillOpacity: USER_MARKER_FILL_OPACITY
        }).addTo(map);
      },
      renderStops: (stops) => {
        stopsLayer.clearLayers();

        for (const stop of stops) {
          const latLng = this.toLatLng(stop.coordinate);

          circleMarker(latLng, {
            radius: STOP_MARKER_RADIUS,
            color: STOP_MARKER_STROKE_COLOR,
            weight: STOP_MARKER_WEIGHT,
            fillColor: STOP_MARKER_COLOR,
            fillOpacity: STOP_MARKER_FILL_OPACITY
          }).addTo(stopsLayer);
        }
      },
      fitToCoordinates: (points) => {
        if (!points.length) {
          return;
        }

        const bounds = this.buildBounds(points);
        map.fitBounds(bounds, { padding: MAP_PADDING });
      },
      renderRoutes: (routes, activeRouteId) => {
        const activeIdentifiers = new Set(routes.map((route) => route.id));

        routePolylines.forEach((polylineHandle: Polyline, identifier: string) => {
          if (!activeIdentifiers.has(identifier)) {
            routeLayer.removeLayer(polylineHandle);
            routePolylines.delete(identifier);
          }
        });

        for (const route of routes) {
          const coordinates = route.coordinates.map((coordinate) => this.toLatLng(coordinate));
          let existing = routePolylines.get(route.id);

          if (!existing) {
            existing = polyline(coordinates, this.resolveRouteStyle(route.id === activeRouteId));
            existing.addTo(routeLayer);
            routePolylines.set(route.id, existing);
          } else {
            existing.setLatLngs(coordinates);
            existing.setStyle(this.resolveRouteStyle(route.id === activeRouteId));
          }
        }
      },
      invalidateSize: () => {
        map.invalidateSize();
      },
      destroy: () => {
        map.remove();
      }
    } satisfies MapHandle;
  }

  private buildMap(container: HTMLElement, options: MapCreateOptions): Map {
    const map = createMap(container, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true
    });

    const tile = tileLayer(TILE_LAYER_URL, {
      attribution: TILE_LAYER_ATTRIBUTION,
      minZoom: options.minZoom ?? DEFAULT_MIN_ZOOM,
      maxZoom: options.maxZoom ?? DEFAULT_MAX_ZOOM
    });

    tile.addTo(map);
    map.setView(this.toLatLng(options.center), options.zoom);

    return map;
  }

  private buildBounds(points: readonly GeoCoordinate[]): LatLngBounds {
    const first = points[0];
    let bounds = latLngBounds(this.toLatLng(first), this.toLatLng(first));

    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      bounds = bounds.extend(this.toLatLng(point));
    }

    return bounds;
  }

  private toLatLng(coordinate: GeoCoordinate): LatLngExpression {
    return [coordinate.latitude, coordinate.longitude];
  }

  private resolveRouteStyle(isActive: boolean): PolylineOptions {
    return {
      color: isActive ? ROUTE_POLYLINE_HIGHLIGHT_COLOR : ROUTE_POLYLINE_COLOR,
      weight: isActive ? ROUTE_POLYLINE_HIGHLIGHT_WEIGHT : ROUTE_POLYLINE_WEIGHT,
      opacity: isActive ? ROUTE_POLYLINE_HIGHLIGHT_OPACITY : ROUTE_POLYLINE_OPACITY,
      lineJoin: ROUTE_POLYLINE_LINE_JOIN,
      lineCap: ROUTE_POLYLINE_LINE_CAP
    } satisfies PolylineOptions;
  }
}
