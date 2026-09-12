import { APP_CONFIG } from '@core/config';
import { buildDescriptiveSlug } from '@core/routing/url-slug';

const ROOT_SEGMENT = '/' as const;
const LINE_SLUG_FALLBACK = 'line' as const;
export const LINE_DETAIL_BASE_SEGMENT = 'lines' as const;
export const LINE_DETAIL_CONSORTIUM_PARAM = 'consortiumId' as const;
export const LINE_DETAIL_LINE_PARAM = 'lineId' as const;
export const LINE_DETAIL_SLUG_PARAM = 'lineSlug' as const;
export const LINE_DETAIL_ROUTE_PATTERN =
  `${LINE_DETAIL_BASE_SEGMENT}/:${LINE_DETAIL_CONSORTIUM_PARAM}/:${LINE_DETAIL_LINE_PARAM}` as const;
export const LINE_DETAIL_DESCRIPTIVE_ROUTE_PATTERN =
  `${LINE_DETAIL_ROUTE_PATTERN}/:${LINE_DETAIL_SLUG_PARAM}` as const;
export const NEWS_DETAIL_CONSORTIUM_PARAM = 'consortiumId' as const;
export const NEWS_DETAIL_ARTICLE_PARAM = 'articleId' as const;
export const NEWS_DETAIL_ROUTE_PATTERN =
  `${APP_CONFIG.routes.news}/:${NEWS_DETAIL_CONSORTIUM_PARAM}/:${NEWS_DETAIL_ARTICLE_PARAM}` as const;

export type NavigationCommands = readonly string[];

export interface StopDetailNavigation {
  readonly commands: NavigationCommands;
  readonly queryParams: Readonly<Record<string, string>>;
}

export interface LineDetailNavigation {
  readonly commands: NavigationCommands;
}

export interface NewsDetailNavigation {
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
  lineId: string,
  lineName?: string
): LineDetailNavigation => {
  const normalizedLineId = lineId.trim();

  validateConsortiumId(consortiumId);

  if (!normalizedLineId) {
    throw new Error('lineId must not be empty');
  }

  const commands = [
    ROOT_SEGMENT,
    LINE_DETAIL_BASE_SEGMENT,
    String(consortiumId),
    normalizedLineId
  ];

  if (lineName !== undefined) {
    commands.push(buildDescriptiveSlug(lineName, LINE_SLUG_FALLBACK));
  }

  return { commands };
};

export const buildNewsDetailNavigation = (
  consortiumId: number,
  articleId: string
): NewsDetailNavigation => {
  const normalizedArticleId = articleId.trim();

  validateConsortiumId(consortiumId);

  if (!normalizedArticleId) {
    throw new Error('articleId must not be empty');
  }

  return {
    commands: [ROOT_SEGMENT, APP_CONFIG.routes.news, String(consortiumId), normalizedArticleId]
  };
};

function validateConsortiumId(consortiumId: number): void {
  if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0) {
    throw new RangeError('consortiumId must be a positive safe integer');
  }
}
