import { SupportedLanguage } from '@core/config';

export interface TransitRouteWorkspaceCopy {
  readonly routeTitle: string;
  readonly stopsTitle: string;
  readonly routeMapLabel: (code: string) => string;
  readonly moreInformation: string;
  readonly mapUnavailable: string;
  readonly originMarkerLabel: string;
  readonly destinationMarkerLabel: string;
  readonly stopOriginLabel: (name: string) => string;
  readonly stopDestinationLabel: (name: string) => string;
  readonly stopNucleusOrdinalLabel: (ordinal: number, nucleus: string) => string;
}

const COPY: Readonly<Record<SupportedLanguage, TransitRouteWorkspaceCopy>> = {
  es: {
    routeTitle: 'Recorrido de la línea',
    stopsTitle: 'Paradas',
    routeMapLabel: (code) => `Mapa interactivo del recorrido de la línea ${code}`,
    moreInformation: 'Más información',
    mapUnavailable:
      'No hay geometría suficiente para dibujar el recorrido. La lista de paradas sigue disponible.',
    originMarkerLabel: 'Origen',
    destinationMarkerLabel: 'Destino',
    stopOriginLabel: (name) => `Origen de la búsqueda: ${name}`,
    stopDestinationLabel: (name) => `Destino de la búsqueda: ${name}`,
    stopNucleusOrdinalLabel: (ordinal, nucleus) => `${ordinal}.ª parada de ${nucleus}`
  },
  en: {
    routeTitle: 'Line route',
    stopsTitle: 'Stops',
    routeMapLabel: (code) => `Interactive route map for line ${code}`,
    moreInformation: 'More information',
    mapUnavailable:
      'There is not enough geometry to draw the route. The stop list is still available.',
    originMarkerLabel: 'Origin',
    destinationMarkerLabel: 'Destination',
    stopOriginLabel: (name) => `Search origin: ${name}`,
    stopDestinationLabel: (name) => `Search destination: ${name}`,
    stopNucleusOrdinalLabel: (ordinal, nucleus) => `${formatEnglishOrdinal(ordinal)} stop in ${nucleus}`
  }
};

function formatEnglishOrdinal(value: number): string {
  const tens = value % 100;

  if (tens >= 11 && tens <= 13) {
    return `${value}th`;
  }

  const units = value % 10;
  const suffix = units === 1 ? 'st' : units === 2 ? 'nd' : units === 3 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

export function getTransitRouteWorkspaceCopy(
  language: string | null | undefined
): TransitRouteWorkspaceCopy {
  return language === 'en' ? COPY.en : COPY.es;
}
