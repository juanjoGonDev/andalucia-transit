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
      language: 'navigation.language',
      lines: 'navigation.lines'
    },
    languages: {
      es: 'languages.es',
      en: 'languages.en'
    },
    home: {
      header: {
        title: 'home.header.title',
        infoLabel: 'home.header.infoLabel'
      },
      sections: {
        recentStops: {
          title: 'home.sections.recentStops.title',
          items: [
            'home.sections.recentStops.items.mainStreet',
            'home.sections.recentStops.items.oakwoodPlaza',
            'home.sections.recentStops.items.cityLibrary'
          ] as const
        },
        findNearby: {
          title: 'home.sections.findNearby.title',
          action: 'home.sections.findNearby.action'
        },
        favorites: {
          title: 'home.sections.favorites.title',
          items: [
            {
              title: 'home.sections.favorites.items.uptown.title',
              subtitle: 'home.sections.favorites.items.uptown.subtitle'
            },
            {
              title: 'home.sections.favorites.items.eastMarket.title',
              subtitle: 'home.sections.favorites.items.eastMarket.subtitle'
            }
          ] as const
        }
      }
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
