import { APP_CONFIG } from '@core/config';
import {
  LINE_DETAIL_BASE_SEGMENT,
  buildLineDetailNavigation,
  buildNewsDetailNavigation,
  buildStopDetailNavigation
} from '@shared/navigation/navigation.util';

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

  it('builds a descriptive line detail route while retaining canonical identity', () => {
    expect(buildLineDetailNavigation(7, ' 380 ', 'Circular Huércal de Almería')).toEqual({
      commands: [
        '/',
        LINE_DETAIL_BASE_SEGMENT,
        '7',
        '380',
        'circular-huercal-de-almeria'
      ]
    });
  });

  it('preserves the legacy line detail route when descriptive metadata is unavailable', () => {
    expect(buildLineDetailNavigation(7, ' 380 ')).toEqual({
      commands: ['/', LINE_DETAIL_BASE_SEGMENT, '7', '380']
    });
  });

  it('builds internal CTAN news detail navigation', () => {
    expect(buildNewsDetailNavigation(7, ' 134 ')).toEqual({
      commands: ['/', APP_CONFIG.routes.news, '7', '134']
    });
  });

  it('rejects invalid navigation identities', () => {
    expect(() => buildLineDetailNavigation(0, '380')).toThrowError(RangeError);
    expect(() => buildLineDetailNavigation(7, '   ')).toThrowError('lineId must not be empty');
    expect(() => buildNewsDetailNavigation(7, '   ')).toThrowError('articleId must not be empty');
  });
});
