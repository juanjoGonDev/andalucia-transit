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
  divIcon,
  latLngBounds,
  layerGroup,
  map as createMap,
  marker,
  polyline,
  tileLayer
} from 'leaflet';
import { buildRouteDirectionIndicators } from '@domain/map/route-overlay-geometry';
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
  readonly code: string;
  readonly municipality: string;
  readonly coordinate: GeoCoordinate;
}

export type MapStopSelectHandler = (stopId: string) => void;
export type MapViewportSettledHandler = (center: GeoCoordinate) => void;

export interface MapStopInteractionOptions {
  readonly getDetailsLabel: () => string;
  readonly onDetails: MapStopSelectHandler;
  readonly onSelect?: MapStopSelectHandler;
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
  onViewportSettled(handler: MapViewportSettledHandler): () => void;
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

interface MapPalette {
  readonly stop: string;
  readonly stopStroke: string;
  readonly user: string;
  readonly userStroke: string;
  readonly route: string;
  readonly routeActive: string;
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
const STOP_MARKER_FILL_OPACITY = 0.9;
const STOP_MARKER_ACTIVE_FILL_OPACITY = 1;
const STOP_MARKER_WEIGHT = 2;
const STOP_MARKER_ACTIVE_WEIGHT = 4;
const USER_MARKER_RADIUS = 10;
const USER_MARKER_FILL_OPACITY = 0.9;
const USER_MARKER_WEIGHT = 3;
const ROUTE_POLYLINE_WEIGHT = 4;
const ROUTE_POLYLINE_HIGHLIGHT_WEIGHT = 6;
const ROUTE_POLYLINE_OPACITY = 0.82;
const ROUTE_POLYLINE_HIGHLIGHT_OPACITY = 1;
const ROUTE_POLYLINE_LINE_JOIN: LineJoinShape = 'round';
const ROUTE_POLYLINE_LINE_CAP: LineCapShape = 'round';
const ROUTE_DIRECTION_INDICATORS = 3;
const ROUTE_DIRECTION_INDICATORS_ACTIVE = 5;
const ROUTE_DIRECTION_ICON_SIZE = 26;
const ROUTE_DIRECTION_ICON_ANCHOR = ROUTE_DIRECTION_ICON_SIZE / 2;
const STOP_POPUP_CLASS = 'app-map-stop-popup' as const;
const STOP_POPUP_CONTENT_CLASS = 'app-map-stop-popup__content' as const;
const STOP_POPUP_HEADER_CLASS = 'app-map-stop-popup__header' as const;
const STOP_POPUP_ICON_CLASS = 'app-map-stop-popup__icon material-symbols-outlined' as const;
const STOP_POPUP_IDENTITY_CLASS = 'app-map-stop-popup__identity' as const;
const STOP_POPUP_TITLE_CLASS = 'app-map-stop-popup__title' as const;
const STOP_POPUP_META_CLASS = 'app-map-stop-popup__meta' as const;
const STOP_POPUP_CODE_CLASS = 'app-map-stop-popup__code' as const;
const STOP_POPUP_MUNICIPALITY_CLASS = 'app-map-stop-popup__municipality' as const;
const STOP_POPUP_ACTION_CLASS = 'app-map-stop-popup__action' as const;
const ROUTE_DIRECTION_CLASS = 'app-map-route-direction' as const;
const ROUTE_DIRECTION_ACTIVE_CLASS = 'app-map-route-direction--active' as const;
const ROUTE_DIRECTION_GLYPH_CLASS =
  'app-map-route-direction__glyph material-symbols-outlined' as const;
const CSS_STOP_COLOR = '--color-success' as const;
const CSS_STOP_STROKE_COLOR = '--color-primary-contrast' as const;
const CSS_USER_COLOR = '--color-warning' as const;
const CSS_USER_STROKE_COLOR = '--color-secondary' as const;
const CSS_ROUTE_COLOR = '--color-primary-midnight' as const;
const CSS_ROUTE_ACTIVE_COLOR = '--color-primary' as const;
const FALLBACK_STOP_COLOR = '#0f9d58' as const;
const FALLBACK_STOP_STROKE_COLOR = '#ffffff' as const;
const FALLBACK_USER_COLOR = '#f59e0b' as const;
const FALLBACK_USER_STROKE_COLOR = '#060f2b' as const;
const FALLBACK_ROUTE_COLOR = '#0d3a9e' as const;
const FALLBACK_ROUTE_ACTIVE_COLOR = '#0061fe' as const;

@Injectable({ providedIn: 'root' })
export class LeafletMapService {
  create(container: HTMLElement, options: MapCreateOptions): MapHandle {
    const map = this.buildMap(container, options);
    const palette = this.resolvePalette(container);
    const stopsLayer = layerGroup().addTo(map);
    const stopMarkers = new globalThis.Map<string, CircleMarker>();
    let userMarker: CircleMarker | null = null;
    let highlightedStopId: string | null = null;
    let selectedStopId: string | null = null;
    const routeLayer = layerGroup().addTo(map);
    const routeDirectionLayer = layerGroup().addTo(map);
    const routePolylines = new globalThis.Map<string, Polyline>();

    const updateStopStyle = (stopId: string | null): void => {
      if (!stopId) {
        return;
      }

      const stopMarker = stopMarkers.get(stopId);

      if (!stopMarker) {
        return;
      }

      const isActive = stopId === highlightedStopId || stopId === selectedStopId;
      stopMarker.setRadius(isActive ? STOP_MARKER_ACTIVE_RADIUS : STOP_MARKER_RADIUS);
      stopMarker.setStyle({
        color: palette.stopStroke,
        weight: isActive ? STOP_MARKER_ACTIVE_WEIGHT : STOP_MARKER_WEIGHT,
        fillColor: palette.stop,
        fillOpacity: isActive ? STOP_MARKER_ACTIVE_FILL_OPACITY : STOP_MARKER_FILL_OPACITY
      });

      if (isActive) {
        stopMarker.bringToFront();
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
          color: palette.userStroke,
          weight: USER_MARKER_WEIGHT,
          fillColor: palette.user,
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
          const stopMarker = circleMarker(latLng, {
            radius: STOP_MARKER_RADIUS,
            color: palette.stopStroke,
            weight: STOP_MARKER_WEIGHT,
            fillColor: palette.stop,
            fillOpacity: STOP_MARKER_FILL_OPACITY
          }).addTo(stopsLayer);

          stopMarkers.set(stop.id, stopMarker);

          if (interactions) {
            const popupContent = this.buildStopPopup(stop, interactions);
            stopMarker.bindPopup(popupContent.element, {
              className: STOP_POPUP_CLASS,
              maxWidth: 320,
              minWidth: 240
            });
            stopMarker.on('popupopen', () => {
              popupContent.action.textContent = interactions.getDetailsLabel();
              const previousSelected = selectedStopId;
              selectedStopId = stop.id;
              updateStopStyle(previousSelected);
              updateStopStyle(selectedStopId);
              interactions.onSelect?.(stop.id);
            });
            stopMarker.on('popupclose', () => {
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
        const stopMarker = stopMarkers.get(stopId);

        if (!stopMarker) {
          return false;
        }

        if (animate) {
          map.flyTo(stopMarker.getLatLng(), zoom, { duration: CAMERA_ANIMATION_DURATION_SECONDS });
        } else {
          map.setView(stopMarker.getLatLng(), zoom);
        }

        stopMarker.openPopup();
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

        routeDirectionLayer.clearLayers();

        for (const route of routes) {
          const isActive = route.id === activeRouteId;
          const coordinates = route.coordinates.map((coordinate) => this.toLatLng(coordinate));
          let existing = routePolylines.get(route.id);

          if (!existing) {
            existing = polyline(coordinates, this.resolveRouteStyle(isActive, palette));
            existing.addTo(routeLayer);
            routePolylines.set(route.id, existing);
          } else {
            existing.setLatLngs(coordinates);
            existing.setStyle(this.resolveRouteStyle(isActive, palette));
          }

          this.renderRouteDirections(routeDirectionLayer, route, isActive);
        }
      },
      onViewportSettled: (handler) => {
        const notify = (): void => {
          const center = map.getCenter();
          handler({ latitude: center.lat, longitude: center.lng });
        };

        map.on('moveend', notify);
        notify();

        return () => {
          map.off('moveend', notify);
        };
      },
      invalidateSize: () => {
        map.invalidateSize();
      },
      destroy: () => {
        map.remove();
      }
    };
  }

  private buildMap(container: HTMLElement, options: MapCreateOptions): Map {
    const map = createMap(container, {
      center: this.toLatLng(options.center),
      zoom: options.zoom,
      minZoom: options.minZoom ?? DEFAULT_MIN_ZOOM,
      maxZoom: options.maxZoom ?? DEFAULT_MAX_ZOOM,
      zoomControl: true,
      attributionControl: true
    });

    tileLayer(TILE_LAYER_URL, {
      attribution: TILE_LAYER_ATTRIBUTION,
      minZoom: options.minZoom ?? DEFAULT_MIN_ZOOM,
      maxZoom: options.maxZoom ?? DEFAULT_MAX_ZOOM
    }).addTo(map);

    return map;
  }

  private buildStopPopup(
    stop: MapStopMarker,
    interactions: MapStopInteractionOptions
  ): StopPopupContent {
    const content = document.createElement('div');
    content.className = STOP_POPUP_CONTENT_CLASS;

    const header = document.createElement('div');
    header.className = STOP_POPUP_HEADER_CLASS;

    const icon = document.createElement('span');
    icon.className = STOP_POPUP_ICON_CLASS;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'directions_bus';

    const identity = document.createElement('div');
    identity.className = STOP_POPUP_IDENTITY_CLASS;

    const title = document.createElement('strong');
    title.className = STOP_POPUP_TITLE_CLASS;
    title.textContent = stop.name;

    const meta = document.createElement('span');
    meta.className = STOP_POPUP_META_CLASS;

    const code = document.createElement('span');
    code.className = STOP_POPUP_CODE_CLASS;
    code.textContent = stop.code;

    const municipality = document.createElement('span');
    municipality.className = STOP_POPUP_MUNICIPALITY_CLASS;
    municipality.textContent = stop.municipality;

    meta.append(code, municipality);
    identity.append(title, meta);
    header.append(icon, identity);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = STOP_POPUP_ACTION_CLASS;
    action.textContent = interactions.getDetailsLabel();
    action.addEventListener('click', () => interactions.onDetails(stop.id));

    content.append(header, action);
    return { element: content, action };
  }

  private resolvePalette(container: HTMLElement): MapPalette {
    const style = getComputedStyle(container);
    return {
      stop: this.resolveCssColor(style, CSS_STOP_COLOR, FALLBACK_STOP_COLOR),
      stopStroke: this.resolveCssColor(style, CSS_STOP_STROKE_COLOR, FALLBACK_STOP_STROKE_COLOR),
      user: this.resolveCssColor(style, CSS_USER_COLOR, FALLBACK_USER_COLOR),
      userStroke: this.resolveCssColor(style, CSS_USER_STROKE_COLOR, FALLBACK_USER_STROKE_COLOR),
      route: this.resolveCssColor(style, CSS_ROUTE_COLOR, FALLBACK_ROUTE_COLOR),
      routeActive: this.resolveCssColor(style, CSS_ROUTE_ACTIVE_COLOR, FALLBACK_ROUTE_ACTIVE_COLOR)
    };
  }

  private resolveCssColor(style: CSSStyleDeclaration, property: string, fallback: string): string {
    const value = style.getPropertyValue(property).trim();
    return value || fallback;
  }

  private toLatLng(coordinate: GeoCoordinate): LatLngExpression {
    return [coordinate.latitude, coordinate.longitude];
  }

  private buildBounds(points: readonly GeoCoordinate[]): LatLngBounds {
    return latLngBounds(points.map((point) => this.toLatLng(point)));
  }

  private resolveRouteStyle(active: boolean, palette: MapPalette): PolylineOptions {
    return {
      color: active ? palette.routeActive : palette.route,
      weight: active ? ROUTE_POLYLINE_HIGHLIGHT_WEIGHT : ROUTE_POLYLINE_WEIGHT,
      opacity: active ? ROUTE_POLYLINE_HIGHLIGHT_OPACITY : ROUTE_POLYLINE_OPACITY,
      lineJoin: ROUTE_POLYLINE_LINE_JOIN,
      lineCap: ROUTE_POLYLINE_LINE_CAP
    };
  }

  private renderRouteDirections(
    routeDirectionLayer: ReturnType<typeof layerGroup>,
    route: MapRoutePolyline,
    active: boolean
  ): void {
    const indicators = buildRouteDirectionIndicators(
      route.coordinates,
      active ? ROUTE_DIRECTION_INDICATORS_ACTIVE : ROUTE_DIRECTION_INDICATORS
    );

    for (const indicator of indicators) {
      const classes = active
        ? `${ROUTE_DIRECTION_CLASS} ${ROUTE_DIRECTION_ACTIVE_CLASS}`
        : ROUTE_DIRECTION_CLASS;
      const icon = divIcon({
        className: classes,
        html: `<span class="${ROUTE_DIRECTION_GLYPH_CLASS}" aria-hidden="true">arrow_upward</span>`,
        iconSize: [ROUTE_DIRECTION_ICON_SIZE, ROUTE_DIRECTION_ICON_SIZE],
        iconAnchor: [ROUTE_DIRECTION_ICON_ANCHOR, ROUTE_DIRECTION_ICON_ANCHOR]
      });
      marker(this.toLatLng(indicator.coordinate), {
        icon,
        interactive: false,
        keyboard: false,
        rotationAngle: indicator.bearing
      } as never).addTo(routeDirectionLayer);
    }
  }
}
