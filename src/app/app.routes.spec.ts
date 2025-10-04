import { APP_CONFIG } from './core/config';
import { routes } from './app.routes';

describe('App Routes', () => {
  it('includes all feature routes', () => {
    const routePaths = routes.map((route) => route.path);
    expect(routePaths).toContain(APP_CONFIG.routes.home);
    expect(routePaths).toContain(APP_CONFIG.routes.stopDetail);
    expect(routePaths).toContain(APP_CONFIG.routes.routeSearch);
    expect(routePaths).toContain(APP_CONFIG.routes.map);
  });
});
