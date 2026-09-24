/**
 * Visual roles for stop markers. Search-scoped maps differentiate the searched
 * origin and destination from the rest of the line stops, and every selection
 * state overrides any role so the active stop is unmistakable.
 */
export type MapStopMarkerRole = 'regular' | 'origin' | 'destination';

export interface MapStopRolePalette {
  readonly regular: string;
  readonly origin: string;
  readonly destination: string;
  readonly highlight: string;
  readonly stroke: string;
  readonly highlightStroke: string;
}

export interface StopMarkerStyle {
  readonly role: MapStopMarkerRole;
  readonly active: boolean;
  readonly fillColor: string;
  readonly color: string;
  readonly weight: number;
  readonly radius: number;
  readonly fillOpacity: number;
}

const REGULAR_RADIUS = 7;
const ROLE_RADIUS = 10;
const ACTIVE_RADIUS = 14;
const REGULAR_WEIGHT = 2;
const ROLE_WEIGHT = 3;
const ACTIVE_WEIGHT = 3;
const REGULAR_FILL_OPACITY = 0.9;
const ACTIVE_FILL_OPACITY = 1;

const ROLE_FILL: Readonly<Record<Exclude<MapStopMarkerRole, 'regular'>, keyof MapStopRolePalette>> =
  {
    origin: 'origin',
    destination: 'destination'
  } as const;

export function resolveStopMarkerRadius(role: MapStopMarkerRole, active: boolean): number {
  if (active) {
    return ACTIVE_RADIUS;
  }

  return role === 'regular' ? REGULAR_RADIUS : ROLE_RADIUS;
}

export function resolveStopMarkerStyle(
  role: MapStopMarkerRole,
  active: boolean,
  palette: MapStopRolePalette
): StopMarkerStyle {
  const radius = resolveStopMarkerRadius(role, active);

  if (active) {
    return {
      role,
      active,
      fillColor: palette.highlight,
      color: palette.highlightStroke,
      weight: ACTIVE_WEIGHT,
      radius,
      fillOpacity: ACTIVE_FILL_OPACITY
    };
  }

  const fillColor = role === 'regular' ? palette.regular : palette[ROLE_FILL[role]];

  return {
    role,
    active,
    fillColor,
    color: palette.stroke,
    weight: role === 'regular' ? REGULAR_WEIGHT : ROLE_WEIGHT,
    radius,
    fillOpacity: REGULAR_FILL_OPACITY
  };
}
