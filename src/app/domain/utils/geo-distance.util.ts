export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_008.8;

export function calculateDistanceInMeters(from: GeoCoordinate, to: GeoCoordinate): number {
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);

  const sineLatitude = Math.sin(deltaLatitude / 2);
  const sineLongitude = Math.sin(deltaLongitude / 2);

  const haversine =
    sineLatitude * sineLatitude +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * sineLongitude * sineLongitude;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * arc;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
