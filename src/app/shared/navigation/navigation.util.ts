import { APP_CONFIG } from '@core/config';

const ROOT_SEGMENT = '/' as const;

export type NavigationCommands = readonly string[];

export interface StopDetailNavigation {
  readonly commands: NavigationCommands;
  readonly queryParams: Readonly<Record<string, string>>;
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

  if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0) {
    throw new RangeError('consortiumId must be a positive safe integer');
  }

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
