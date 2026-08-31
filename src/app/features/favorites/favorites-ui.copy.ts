import { SupportedLanguage } from '@core/config';

export interface FavoritesUiCopy {
  readonly title: string;
  readonly description: string;
  readonly empty: string;
  readonly stopsTitle: string;
  readonly linesTitle: string;
  readonly lineModeLabel: string;
  readonly openFavorites: string;
}

const COPY: Readonly<Record<SupportedLanguage, FavoritesUiCopy>> = {
  es: {
    title: 'Favoritos',
    description: 'Guarda tus paradas y líneas habituales y accede rápidamente a sus detalles.',
    empty: 'Todavía no has añadido ninguna parada o línea favorita.',
    stopsTitle: 'Paradas',
    linesTitle: 'Líneas',
    lineModeLabel: 'Modo',
    openFavorites: 'Abrir favoritos'
  },
  en: {
    title: 'Favorites',
    description: 'Save the stops and lines you use most and jump quickly to their details.',
    empty: 'You have not added any favorite stops or lines yet.',
    stopsTitle: 'Stops',
    linesTitle: 'Lines',
    lineModeLabel: 'Mode',
    openFavorites: 'Open favorites'
  }
};

export function getFavoritesUiCopy(language: string | null | undefined): FavoritesUiCopy {
  return language === 'en' ? COPY.en : COPY.es;
}
