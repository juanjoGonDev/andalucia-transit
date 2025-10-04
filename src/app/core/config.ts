export const APP_CONFIG = {
  appName: 'Andalucia Transit',
  apiBaseUrl: 'https://api.ctan.es',
  locales: {
    default: 'es',
    fallback: 'es',
    storageKey: 'andalucia-transit.language',
    supported: ['es', 'en'] as const,
    assetsPath: 'assets/i18n/',
    fileExtension: '.json'
  },
  routes: {
    home: '',
    stopDetail: 'stop-detail',
    routeSearch: 'route-search',
    map: 'map'
  },
  translationKeys: {
    navigation: {
      home: 'navigation.home',
      stopDetail: 'navigation.stopDetail',
      routeSearch: 'navigation.routeSearch',
      map: 'navigation.map',
      language: 'navigation.language'
    },
    languages: {
      es: 'languages.es',
      en: 'languages.en'
    },
    home: {
      title: 'home.title',
      description: 'home.description',
      action: 'home.action',
      recent: 'home.recent',
      nearby: 'home.nearby',
      favorites: 'home.favorites',
      recentDescription: 'home.recentDescription',
      nearbyDescription: 'home.nearbyDescription',
      favoritesDescription: 'home.favoritesDescription'
    },
    stopDetail: {
      title: 'stopDetail.title',
      description: 'stopDetail.description',
      upcoming: 'stopDetail.upcoming',
      history: 'stopDetail.history',
      upcomingItems: [
        'stopDetail.upcomingItems.first',
        'stopDetail.upcomingItems.second',
        'stopDetail.upcomingItems.third'
      ] as const,
      historyItems: [
        'stopDetail.historyItems.first',
        'stopDetail.historyItems.second'
      ] as const
    },
    routeSearch: {
      title: 'routeSearch.title',
      description: 'routeSearch.description',
      action: 'routeSearch.action',
      results: 'routeSearch.results',
      originLabel: 'routeSearch.originLabel',
      destinationLabel: 'routeSearch.destinationLabel',
      dateLabel: 'routeSearch.dateLabel',
      sampleResult: 'routeSearch.sampleResult'
    },
    map: {
      title: 'map.title',
      description: 'map.description',
      openList: 'map.openList',
      hint: 'map.hint'
    }
  }
} as const;

export type AppConfig = typeof APP_CONFIG;
export type SupportedLanguage = (typeof APP_CONFIG.locales.supported)[number];
