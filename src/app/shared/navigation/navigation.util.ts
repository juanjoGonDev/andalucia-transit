import { APP_CONFIG } from '@core/config';

const ROOT_SEGMENT = '/' as const;
export const LINE_DETAIL_BASE_SEGMENT = 'lines' as const;
export const LINE_DETAIL_CONSORTIUM_PARAM = 'consortiumId' as const;
export const LINE_DETAIL_LINE_PARAM = 'lineId' as const;
export const LINE_DETAIL_ROUTE_PATTERN =
  `${LINE_DETAIL_BASE_SEGMENT}/:${LINE_DETAIL_CONSORTIUM_PARAM}/:${LINE_DETAIL_LINE_PARAM}` as const;

export type NavigationCommands = readonly string[];

export interface StopDetailNavigation {
  readonly commands: NavigationCommands;
  readonly queryParams: Readonly<Record<string, string>>;
}

export interface LineDetailNavigation {
  readonly commands: NavigationCommands;
}

export const buildNavigationCommands = (path: string): NavigationCommands => {
  if (!path) {
    return [ROOT_SEGMENT];
  }

  return [ROOT_SEGMENT, path];
};

export const buildStopDetailNavigation = (
  consortiumId: number,
  stopId: string
): StopDetailNavigation => {
  const normalizedStopId = stopId.trim();

  validateConsortiumId(consortiumId);

  if (!normalizedStopId) {
    throw new Error('stopId must not be empty');
  }

  return {
    commands: [ROOT_SEGMENT, APP_CONFIG.routes.stopDetailBase, normalizedStopId],
    queryParams: {
      [APP_CONFIG.routeParams.stopInfo.consortiumId]: String(consortiumId)
    }
  };
};

export const buildLineDetailNavigation = (
  consortiumId: number,
  lineId: string
): LineDetailNavigation => {
  const normalizedLineId = lineId.trim();

  validateConsortiumId(consortiumId);

  if (!normalizedLineId) {
    throw new Error('lineId must not be empty');
  }

  return {
    commands: [ROOT_SEGMENT, LINE_DETAIL_BASE_SEGMENT, String(consortiumId), normalizedLineId]
  };
};

function validateConsortiumId(consortiumId: number): void {
  if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0) {
    throw new RangeError('consortiumId must be a positive safe integer');
  }
}
