import { NearbyStopRecord } from '@core/services/nearby-stops.service';
import { buildMapSearchTargets, searchMapTargets } from '@features/map/map-search.util';

const RECORDS: readonly NearbyStopRecord[] = [
  {
    consortiumId: 1,
    stopId: 'sevilla:prado',
    stopCode: '001',
    name: 'Prado de San Sebastián',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Centro',
    nucleusId: 'centro',
    zone: 'A',
    latitude: 37.377,
    longitude: -5.986
  },
  {
    consortiumId: 1,
    stopId: 'sevilla:santa-justa',
    stopCode: '002',
    name: 'Santa Justa',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Nervión',
    nucleusId: 'nervion',
    zone: 'A',
    latitude: 37.392,
    longitude: -5.975
  },
  {
    consortiumId: 2,
    stopId: 'malaga:centro',
    stopCode: '101',
    name: 'Alameda Principal',
    municipality: 'Málaga',
    municipalityId: 'malaga',
    nucleus: 'Centro',
    nucleusId: 'centro',
    zone: 'B',
    latitude: 36.718,
    longitude: -4.421
  }
];

describe('map search targets', () => {
  it('builds stop, municipality, nucleus and zone targets from one canonical record set', () => {
    const targets = buildMapSearchTargets(RECORDS);

    expect(targets.filter((target) => target.kind === 'stop').length).toBe(3);
    expect(
      targets.some(
        (target) => target.kind === 'area' && target.areaKind === 'municipality' && target.name === 'Sevilla'
      )
    ).toBeTrue();
    expect(
      targets.some(
        (target) =>
          target.kind === 'area' &&
          target.areaKind === 'nucleus' &&
          target.name === 'Centro' &&
          target.context === 'Sevilla'
      )
    ).toBeTrue();
    expect(
      targets.some(
        (target) =>
          target.kind === 'area' &&
          target.areaKind === 'zone' &&
          target.name === 'A' &&
          target.context === 'Sevilla' &&
          target.coordinates.length === 2
      )
    ).toBeTrue();
  });

  it('finds stops by name, code and municipality without accent sensitivity', () => {
    const targets = buildMapSearchTargets(RECORDS);

    expect(searchMapTargets(targets, 'prado')[0]).toEqual(
      jasmine.objectContaining({ kind: 'stop', id: 'sevilla:prado' })
    );
    expect(searchMapTargets(targets, '002')[0]).toEqual(
      jasmine.objectContaining({ kind: 'stop', id: 'sevilla:santa-justa' })
    );
    expect(searchMapTargets(targets, 'malaga').some((target) => target.kind === 'stop')).toBeTrue();
  });

  it('prioritizes matching areas and keeps results bounded', () => {
    const targets = buildMapSearchTargets(RECORDS);
    const results = searchMapTargets(targets, 'sev', 2);

    expect(results.length).toBe(2);
    expect(results[0]).toEqual(
      jasmine.objectContaining({ kind: 'area', areaKind: 'municipality', name: 'Sevilla' })
    );
  });
});
