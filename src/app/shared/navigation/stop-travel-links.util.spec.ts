import { buildStopTravelLinks } from '@shared/navigation/stop-travel-links.util';

describe('stop travel links', () => {
  it('builds walking directions URLs that delegate street routing to installed map providers', () => {
    const links = buildStopTravelLinks('Estación Intermodal', {
      latitude: 36.8401,
      longitude: -2.4601
    });

    expect(links.googleMaps).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=36.8401%2C-2.4601&travelmode=walking'
    );
    expect(links.appleMaps).toBe(
      'https://maps.apple.com/?daddr=36.8401%2C-2.4601&dirflg=w&q=Estaci%C3%B3n%20Intermodal'
    );
  });

  it('rejects invalid map coordinates', () => {
    expect(() => buildStopTravelLinks('Invalid', { latitude: 120, longitude: -2 })).toThrowError(
      RangeError
    );
  });
});
