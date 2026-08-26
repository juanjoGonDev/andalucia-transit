import { NearbyStopRecord } from '@core/services/nearby-stops.service';
import { buildStopIdentity } from '@core/services/stop-identity.util';
import { buildMapSearchTargets, searchMapTargets } from '@features/map/map-search.util';

const RECORDS: readonly NearbyStopRecord[] = [
  {
    consortiumId: 1,
    stopId: '119',
    stopCode: '001',
    name: 'Prado de San Sebastián',
    municipality: 'Sevilla',
    municipalityId: '1',
    nucleus: 'Centro',
    nucleusId: '1',
    zone: 'A',
    latitude: 37.377,
    longitude: -5.986
  },
  {
    consortiumId: 1,
    stopId: '120',
    stopCode: '002',
    name: 'Santa Justa',
    municipality: 'Sevilla',
    municipalityId: '1',
    nucleus: 'Nervión',
    nucleusId: '2',
    zone: 'A',
    latitude: 37.392,
    longitude: -5.975
  },
  {
    consortiumId: 2,
    stopId: '119',
    stopCode: '119',
    name: 'Cádiz Centro',
    municipality: 'Cádiz',
    municipalityId: '1',
    nucleus: 'Centro',
    nucleusId: '1',
    zone: 'A',
    latitude: 36.529,
    longitude: -6.292
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

  it('keeps stop and area identities distinct when consortiums reuse local identifiers', () => {
    const targets = buildMapSearchTargets(RECORDS);
    const stops = targets.filter((target) => target.kind === 'stop');
    const municipalities = targets.filter(
      (target) => target.kind === 'area' && target.areaKind === 'municipality'
    );

    expect(stops.map((target) => target.id)).toContain(buildStopIdentity(1, '119'));
    expect(stops.map((target) => target.id)).toContain(buildStopIdentity(2, '119'));
    expect(municipalities.length).toBe(2);
    expect(new Set(municipalities.map((target) => target.id)).size).toBe(2);
  });

  it('finds stops by name, code and municipality without accent sensitivity', () => {
    const targets = buildMapSearchTargets(RECORDS);

    expect(searchMapTargets(targets, 'prado')[0]).toEqual(
      jasmine.objectContaining({ kind: 'stop', id: buildStopIdentity(1, '119') })
    );
    expect(searchMapTargets(targets, '002')[0]).toEqual(
      jasmine.objectContaining({ kind: 'stop', id: buildStopIdentity(1, '120') })
    );
    expect(searchMapTargets(targets, 'cadiz').some((target) => target.kind === 'stop')).toBeTrue();
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
