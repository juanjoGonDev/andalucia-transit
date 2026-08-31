import { SupportedLanguage } from '@core/config';

export interface LinesUiCopy {
  readonly title: string;
  readonly description: string;
  readonly filtersTitle: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly provinceLabel: string;
  readonly allProvinces: string;
  readonly areaLabel: string;
  readonly allAreas: string;
  readonly municipalityLabel: string;
  readonly allMunicipalities: string;
  readonly nucleusLabel: string;
  readonly allNuclei: string;
  readonly nearMe: string;
  readonly nearMeActive: string;
  readonly clearFilters: string;
  readonly loading: string;
  readonly loadingGeography: string;
  readonly locationError: string;
  readonly empty: string;
  readonly noMatches: string;
  readonly paginationLabel: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly openLine: (code: string, name: string) => string;
  readonly resultCount: (count: number) => string;
  readonly pageStatus: (current: number, total: number) => string;
}

const COPY: Readonly<Record<SupportedLanguage, LinesUiCopy>> = {
  es: {
    title: 'Líneas',
    description: 'Explora las líneas de transporte de Andalucía y abre su recorrido y paradas.',
    filtersTitle: 'Buscar y filtrar líneas',
    searchLabel: 'Buscar línea',
    searchPlaceholder: 'Código o nombre de línea',
    provinceLabel: 'Provincia',
    allProvinces: 'Todas las provincias',
    areaLabel: 'Área de transporte',
    allAreas: 'Todas las áreas',
    municipalityLabel: 'Municipio',
    allMunicipalities: 'Todos los municipios',
    nucleusLabel: 'Núcleo',
    allNuclei: 'Todos los núcleos',
    nearMe: 'Cerca de mí',
    nearMeActive: 'Mostrando líneas cercanas',
    clearFilters: 'Limpiar filtros',
    loading: 'Cargando líneas…',
    loadingGeography: 'Comprobando las líneas que pasan por la zona seleccionada…',
    locationError: 'No pudimos obtener tu ubicación. Puedes seguir usando el resto de filtros.',
    empty: 'No hay líneas disponibles en el catálogo.',
    noMatches: 'No hay líneas que coincidan con los filtros seleccionados.',
    paginationLabel: 'Paginación de líneas',
    previousPage: 'Anterior',
    nextPage: 'Siguiente',
    openLine: (code, name) => `Abrir línea ${code}, ${name}`,
    resultCount: (count) => `${count} ${count === 1 ? 'línea' : 'líneas'}`,
    pageStatus: (current, total) => `Página ${current} de ${total}`
  },
  en: {
    title: 'Lines',
    description: 'Explore Andalusia transport lines and open each route and its stops.',
    filtersTitle: 'Search and filter lines',
    searchLabel: 'Search line',
    searchPlaceholder: 'Line code or name',
    provinceLabel: 'Province',
    allProvinces: 'All provinces',
    areaLabel: 'Transport area',
    allAreas: 'All areas',
    municipalityLabel: 'Municipality',
    allMunicipalities: 'All municipalities',
    nucleusLabel: 'Nucleus',
    allNuclei: 'All nuclei',
    nearMe: 'Near me',
    nearMeActive: 'Showing nearby lines',
    clearFilters: 'Clear filters',
    loading: 'Loading lines…',
    loadingGeography: 'Checking lines that serve the selected area…',
    locationError: 'We could not access your location. You can keep using the other filters.',
    empty: 'There are no lines available in the catalog.',
    noMatches: 'No lines match the selected filters.',
    paginationLabel: 'Lines pagination',
    previousPage: 'Previous',
    nextPage: 'Next',
    openLine: (code, name) => `Open line ${code}, ${name}`,
    resultCount: (count) => `${count} ${count === 1 ? 'line' : 'lines'}`,
    pageStatus: (current, total) => `Page ${current} of ${total}`
  }
};

export function getLinesUiCopy(language: string | null | undefined): LinesUiCopy {
  return language === 'en' ? COPY.en : COPY.es;
}
