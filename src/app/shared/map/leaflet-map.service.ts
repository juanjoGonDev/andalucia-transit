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
  map as createMap,
  latLngBounds,
  layerGroup,
  polyline,
  tileLayer
} from 'leaflet';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';

export interface MapCreateOptions {
  readonly center: GeoCoordinate;
  readonly zoom: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

export interface MapStopMarker {
  readonly id: string;
  readonly name: string;
  readonly coordinate: GeoCoordinate;
}

export type MapStopSelectHandler = (stopId: string) => void;

export interface MapStopInteractionOptions {
  readonly getDetailsLabel: () => string;
  readonly onDetails: MapStopSelectHandler;
}

export interface MapHandle {
  setView(center: GeoCoordinate, zoom: number, animate?: boolean): void;
  renderUserLocation(coordinate: GeoCoordinate): void;
  renderStops(
    stops: readonly MapStopMarker[],
    interactions?: MapStopInteractionOptions
  ): void;
  fitToCoordinates(points: readonly GeoCoordinate[], animate?: boolean): void;
  restrictToCoordinates(points: readonly GeoCoordinate[]): void;
  highlightStop(stopId: string | null): void;
  focusStop(stopId: string, zoom: number, animate?: boolean): boolean;
  renderRoutes(routes: readonly MapRoutePolyline[], activeRouteId: string | null): void;
  invalidateSize(): void;
  destroy(): void;
}

export interface MapRoutePolyline {
  readonly id: string;
  readonly coordinates: readonly GeoCoordinate[];
}

interface StopPopupContent {
  readonly element: HTMLDivElement;
  readonly action: HTMLButtonElement;
}

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' as const;
const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' as const;
const DEFAULT_MIN_ZOOM = 6;
const DEFAULT_MAX_ZOOM = 17;
const MAP_PADDING: [number, number] = [32, 32];
const NETWORK_BOUNDS_PADDING_RATIO = 0.08;
const CAMERA_ANIMATION_DURATION_SECONDS = 0.65;
const STOP_MARKER_RADIUS = 7;
const STOP_MARKER_ACTIVE_RADIUS = 11;
const STOP_MARKER_COLOR = 'var(--color-primary)' as const;
const STOP_MARKER_ACTIVE_COLOR = 'var(--color-secondary)' as const;
const STOP_MARKER_STROKE_COLOR = 'var(--color-primary-midnight)' as const;
const STOP_MARKER_FILL_OPACITY = 0.85;
const STOP_MARKER_ACTIVE_FILL_OPACITY = 1;
const STOP_MARKER_WEIGHT = 2;
const STOP_MARKER_ACTIVE_WEIGHT = 3;
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
const STOP_POPUP_CLASS = 'app-map-stop-popup' as const;
const STOP_POPUP_CONTENT_CLASS = 'app-map-stop-popup__content' as const;
const STOP_POPUP_TITLE_CLASS = 'app-map-stop-popup__title' as const;
const STOP_POPUP_ACTION_CLASS = 'app-map-stop-popup__action' as const;

@Injectable({ providedIn: 'root' })
export class LeafletMapService {
  create(container: HTMLElement, options: MapCreateOptions): MapHandle {
    const map = this.buildMap(container, options);
    const stopsLayer = layerGroup().addTo(map);
    const stopMarkers = new globalThis.Map<string, CircleMarker>();
    let userMarker: CircleMarker | null = null;
    let highlightedStopId: string | null = null;
    let selectedStopId: string | null = null;
    const routeLayer = layerGroup().addTo(map);
    const routePolylines = new globalThis.Map<string, Polyline>();

    const updateStopStyle = (stopId: string | null): void => {
      if (!stopId) {
        return;
      }

      const marker = stopMarkers.get(stopId);

      if (!marker) {
        return;
      }

      const isActive = stopId === highlightedStopId || stopId === selectedStopId;
      marker.setRadius(isActive ? STOP_MARKER_ACTIVE_RADIUS : STOP_MARKER_RADIUS);
      marker.setStyle({
        color: STOP_MARKER_STROKE_COLOR,
        weight: isActive ? STOP_MARKER_ACTIVE_WEIGHT : STOP_MARKER_WEIGHT,
        fillColor: isActive ? STOP_MARKER_ACTIVE_COLOR : STOP_MARKER_COLOR,
        fillOpacity: isActive ? STOP_MARKER_ACTIVE_FILL_OPACITY : STOP_MARKER_FILL_OPACITY
      });

      if (isActive) {
        marker.bringToFront();
      }
    };

    return {
      setView: (center, zoom, animate = false) => {
        const latLng = this.toLatLng(center);

        if (animate) {
          map.flyTo(latLng, zoom, { duration: CAMERA_ANIMATION_DURATION_SECONDS });
          return;
        }

        map.setView(latLng, zoom);
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
      renderStops: (stops, interactions) => {
        stopsLayer.clearLayers();
        stopMarkers.clear();
        highlightedStopId = null;
        selectedStopId = null;

        for (const stop of stops) {
          const latLng = this.toLatLng(stop.coordinate);
          const marker = circleMarker(latLng, {
            radius: STOP_MARKER_RADIUS,
            color: STOP_MARKER_STROKE_COLOR,
            weight: STOP_MARKER_WEIGHT,
            fillColor: STOP_MARKER_COLOR,
            fillOpacity: STOP_MARKER_FILL_OPACITY
          }).addTo(stopsLayer);

          stopMarkers.set(stop.id, marker);

          if (interactions) {
            const popupContent = this.buildStopPopup(stop, interactions);
            marker.bindPopup(popupContent.element, { className: STOP_POPUP_CLASS });
            marker.on('popupopen', () => {
              popupContent.action.textContent = interactions.getDetailsLabel();
              const previousSelected = selectedStopId;
              selectedStopId = stop.id;
              updateStopStyle(previousSelected);
              updateStopStyle(selectedStopId);
            });
            marker.on('popupclose', () => {
              if (selectedStopId !== stop.id) {
                return;
              }

              selectedStopId = null;
              updateStopStyle(stop.id);
            });
          }
        }
      },
      fitToCoordinates: (points, animate = false) => {
        if (!points.length) {
          return;
        }

        const bounds = this.buildBounds(points);

        if (animate) {
          map.flyToBounds(bounds, {
            padding: MAP_PADDING,
            duration: CAMERA_ANIMATION_DURATION_SECONDS
          });
          return;
        }

        map.fitBounds(bounds, { padding: MAP_PADDING });
      },
      restrictToCoordinates: (points) => {
        if (!points.length) {
          return;
        }

        const bounds = this.buildBounds(points).pad(NETWORK_BOUNDS_PADDING_RATIO);
        map.setMaxBounds(bounds);
        map.panInsideBounds(bounds, { animate: false });
      },
      highlightStop: (stopId) => {
        const previous = highlightedStopId;
        highlightedStopId = stopId;
        updateStopStyle(previous);
        updateStopStyle(highlightedStopId);
      },
      focusStop: (stopId, zoom, animate = false) => {
        const marker = stopMarkers.get(stopId);

        if (!marker) {
          return false;
        }

        if (animate) {
          map.flyTo(marker.getLatLng(), zoom, { duration: CAMERA_ANIMATION_DURATION_SECONDS });
        } else {
          map.setView(marker.getLatLng(), zoom);
        }

        marker.openPopup();
        return true;
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
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
      dragging: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      maxBoundsViscosity: 1
    });

    const tile = tileLayer(TILE_LAYER_URL, {
      attribution: TILE_LAYER_ATTRIBUTION,
      minZoom: options.minZoom ?? DEFAULT_MIN_ZOOM,
      maxZoom: options.maxZoom ?? DEFAULT_MAX_ZOOM,
      noWrap: true
    });

    tile.addTo(map);
    map.setView(this.toLatLng(options.center), options.zoom);

    return map;
  }

  private buildStopPopup(
    stop: MapStopMarker,
    interactions: MapStopInteractionOptions
  ): StopPopupContent {
    const element = document.createElement('div');
    element.className = STOP_POPUP_CONTENT_CLASS;

    const title = document.createElement('strong');
    title.className = STOP_POPUP_TITLE_CLASS;
    title.textContent = stop.name;
    element.appendChild(title);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = STOP_POPUP_ACTION_CLASS;
    action.textContent = interactions.getDetailsLabel();
    action.addEventListener('click', () => interactions.onDetails(stop.id));
    element.appendChild(action);

    return { element, action };
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
