import { SupportedLanguage } from '@core/config';

export interface TransitRouteWorkspaceCopy {
  readonly routeTitle: string;
  readonly stopsTitle: string;
  readonly routeMapLabel: (code: string) => string;
  readonly moreInformation: string;
  readonly mapUnavailable: string;
}

const COPY: Readonly<Record<SupportedLanguage, TransitRouteWorkspaceCopy>> = {
  es: {
    routeTitle: 'Recorrido de la línea',
    stopsTitle: 'Paradas',
    routeMapLabel: (code) => `Mapa interactivo del recorrido de la línea ${code}`,
    moreInformation: 'Más información',
    mapUnavailable:
      'No hay geometría suficiente para dibujar el recorrido. La lista de paradas sigue disponible.'
  },
  en: {
    routeTitle: 'Line route',
    stopsTitle: 'Stops',
    routeMapLabel: (code) => `Interactive route map for line ${code}`,
    moreInformation: 'More information',
    mapUnavailable:
      'There is not enough geometry to draw the route. The stop list is still available.'
  }
};

export function getTransitRouteWorkspaceCopy(
  language: string | null | undefined
): TransitRouteWorkspaceCopy {
  return language === 'en' ? COPY.en : COPY.es;
}
