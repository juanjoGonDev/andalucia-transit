import { SupportedLanguage } from '@core/config';

export type NewsSortOrder = 'newest' | 'oldest';

export interface NewsUiCopy {
  readonly filtersTitle: string;
  readonly filtersDescription: string;
  readonly areaLabel: string;
  readonly allAreas: string;
  readonly categoryLabel: string;
  readonly allCategories: string;
  readonly orderLabel: string;
  readonly newestFirst: string;
  readonly oldestFirst: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly paginationLabel: string;
  readonly resultCount: (count: number) => string;
  readonly pageStatus: (current: number, total: number) => string;
}

const NEWS_UI_COPY: Readonly<Record<SupportedLanguage, NewsUiCopy>> = {
  es: {
    filtersTitle: 'Filtrar noticias',
    filtersDescription: 'Acota la actualidad por área de transporte y categoría, y elige el orden.',
    areaLabel: 'Área',
    allAreas: 'Todas las áreas',
    categoryLabel: 'Categoría',
    allCategories: 'Todas las categorías',
    orderLabel: 'Orden',
    newestFirst: 'Más recientes primero',
    oldestFirst: 'Más antiguas primero',
    previousPage: 'Anterior',
    nextPage: 'Siguiente',
    paginationLabel: 'Paginación de noticias',
    resultCount: (count) => `${count} ${count === 1 ? 'noticia' : 'noticias'}`,
    pageStatus: (current, total) => `Página ${current} de ${total}`
  },
  en: {
    filtersTitle: 'Filter news',
    filtersDescription: 'Narrow updates by transport area and category, then choose the ordering.',
    areaLabel: 'Area',
    allAreas: 'All areas',
    categoryLabel: 'Category',
    allCategories: 'All categories',
    orderLabel: 'Order',
    newestFirst: 'Newest first',
    oldestFirst: 'Oldest first',
    previousPage: 'Previous',
    nextPage: 'Next',
    paginationLabel: 'News pagination',
    resultCount: (count) => `${count} ${count === 1 ? 'article' : 'articles'}`,
    pageStatus: (current, total) => `Page ${current} of ${total}`
  }
};

export function getNewsUiCopy(language: string | null | undefined): NewsUiCopy {
  return language === 'en' ? NEWS_UI_COPY.en : NEWS_UI_COPY.es;
}
