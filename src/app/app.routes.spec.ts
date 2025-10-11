import { APP_CONFIG } from './core/config';
import { routes } from './app.routes';

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
    expect(routePaths).toContain(APP_CONFIG.routes.stopDetailPattern);
    expect(routePaths).toContain(APP_CONFIG.routes.routeSearch);
    expect(routePaths).toContain(APP_CONFIG.routes.map);
  });
});
