export interface DistanceTranslationKeys {
  readonly meters: string;
  readonly kilometers: string;
}

export interface DistanceDisplay {
  readonly value: string;
  readonly translationKey: string;
}

const METERS_PER_KILOMETER = 1_000;
const KILOMETER_DECIMALS = 1;
const METER_DECIMALS = 0;

export function buildDistanceDisplay(
  distanceInMeters: number,
  translationKeys: DistanceTranslationKeys,
  locale?: string
): DistanceDisplay {
  const useKilometers = distanceInMeters >= METERS_PER_KILOMETER;
  const translationKey = useKilometers ? translationKeys.kilometers : translationKeys.meters;
  const value = formatDistance(
    useKilometers ? distanceInMeters / METERS_PER_KILOMETER : distanceInMeters,
    useKilometers ? KILOMETER_DECIMALS : METER_DECIMALS,
    locale
  );

  return {
    value,
    translationKey
  };
}

function formatDistance(value: number, fractionDigits: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}
