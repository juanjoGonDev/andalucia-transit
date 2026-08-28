import { routes } from '@app/app.routes';
import { APP_CONFIG } from '@core/config';
import {
  LINE_DETAIL_ROUTE_PATTERN,
  NEWS_DETAIL_ROUTE_PATTERN
} from '@shared/navigation/navigation.util';

const collectPaths = (configuredRoutes = routes): readonly string[] => {
  return configuredRoutes.flatMap((route) => {
    const currentPath = route.path ?? '';
    if (route.children && route.children.length > 0) {
      return [currentPath, ...collectPaths(route.children)];
    }
    return [currentPath];
  });
};

describe('App Routes', () => {
  it('includes all feature routes', () => {
    const routePaths = collectPaths();
    expect(routePaths).toContain(APP_CONFIG.routes.home);
    expect(routePaths).toContain(APP_CONFIG.routes.homeRecent);
    expect(routePaths).toContain(APP_CONFIG.routes.homeFavorites);
    expect(routePaths).toContain(APP_CONFIG.routes.stopDetailPattern);
    expect(routePaths).toContain(APP_CONFIG.routes.routeSearch);
    expect(routePaths).toContain(APP_CONFIG.routes.settings);
    expect(routePaths).toContain(APP_CONFIG.routes.map);
    expect(routePaths).toContain(LINE_DETAIL_ROUTE_PATTERN);
    expect(routePaths).toContain(NEWS_DETAIL_ROUTE_PATTERN);
  });
});
