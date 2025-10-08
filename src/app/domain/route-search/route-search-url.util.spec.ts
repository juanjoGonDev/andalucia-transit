import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import {
  buildRouteSearchPath,
  buildDateSlug,
  buildStopSlug,
  parseDateSlug,
  parseStopSlug,
  RouteSearchSegments
} from './route-search-url.util';

describe('route-search-url.util', () => {
  const segments: RouteSearchSegments = {
    base: 'routes',
    connector: 'to',
    date: 'on'
  };

  const option: StopDirectoryOption = {
    id: 'group-1',
    code: 'code-1',
    name: 'La Gangosa - Av. del Prado',
    municipality: 'Vícar',
    municipalityId: 'mun-1',
    nucleus: 'La Gangosa',
    nucleusId: 'nuc-1',
    consortiumId: 7,
    stopIds: ['74', '75']
  };

  it('builds a slug removing diacritics and attaching the primary stop id', () => {
    const slug = buildStopSlug(option);
    expect(slug).toBe('la-gangosa-av-del-prado--74');
  });

  it('extracts the stop identifier from a slug', () => {
    const result = parseStopSlug('estacion-intermodal--100');
    expect(result).toEqual({ stopId: '100' });
  });

  it('returns null when the slug is malformed', () => {
    expect(parseStopSlug('invalid-slug')).toBeNull();
  });

  it('builds route search navigation commands', () => {
    const destination: StopDirectoryOption = {
      ...option,
      id: 'group-2',
      name: 'Estación Intermodal',
      stopIds: ['100']
    };

    const commands = buildRouteSearchPath(option, destination, new Date('2025-10-08T00:00:00Z'), segments);

    expect(commands).toEqual([
      '',
      'routes',
      'la-gangosa-av-del-prado--74',
      'to',
      'estacion-intermodal--100',
      'on',
      '2025-10-08'
    ]);
  });

  it('builds and parses date slugs', () => {
    const date = new Date(2025, 9, 8);
    const slug = buildDateSlug(date);

    expect(slug).toBe('2025-10-08');
    const parsed = parseDateSlug(slug);
    expect(parsed?.getFullYear()).toBe(2025);
    expect(parsed?.getMonth()).toBe(9);
    expect(parsed?.getDate()).toBe(8);
    expect(parseDateSlug('invalid')).toBeNull();
  });
});
