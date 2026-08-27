import { APP_CONFIG } from '@core/config';
import { buildStopDetailNavigation } from '@shared/navigation/navigation.util';

describe('navigation util', () => {
  it('builds consortium-aware stop detail navigation from canonical identity', () => {
    expect(buildStopDetailNavigation(7, '119')).toEqual({
      commands: ['/', APP_CONFIG.routes.stopDetailBase, '119'],
      queryParams: {
        [APP_CONFIG.routeParams.stopInfo.consortiumId]: '7'
      }
    });
  });

  it('normalizes surrounding stop identifier whitespace', () => {
    expect(buildStopDetailNavigation(4, ' 625 ')).toEqual({
      commands: ['/', APP_CONFIG.routes.stopDetailBase, '625'],
      queryParams: {
        [APP_CONFIG.routeParams.stopInfo.consortiumId]: '4'
      }
    });
  });
});
