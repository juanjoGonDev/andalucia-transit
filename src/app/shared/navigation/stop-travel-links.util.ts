import type { GeoCoordinate } from '@domain/utils/geo-distance.util';

export interface StopTravelLinks {
  readonly googleMaps: string;
  readonly appleMaps: string;
}

export function buildStopTravelLinks(name: string, coordinate: GeoCoordinate): StopTravelLinks {
  validateCoordinate(coordinate);

  const destination = `${coordinate.latitude},${coordinate.longitude}`;
  const encodedDestination = encodeURIComponent(destination);
  const encodedName = encodeURIComponent(name.trim());

  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=walking`,
    appleMaps: `https://maps.apple.com/?daddr=${encodedDestination}&dirflg=w&q=${encodedName}`
  };
}

function validateCoordinate(coordinate: GeoCoordinate): void {
  if (
    !Number.isFinite(coordinate.latitude) ||
    !Number.isFinite(coordinate.longitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90 ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new RangeError('coordinate must contain valid latitude and longitude values');
  }
}
