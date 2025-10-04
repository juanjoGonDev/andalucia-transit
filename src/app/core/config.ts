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
  formats: {
    isoDate: 'yyyy-MM-dd'
  },
  routes: {
    home: '',
    stopDetail: 'stop-detail',
    routeSearch: 'route-search',
    map: 'map'
  },
  errors: {
    geolocationNotSupported: 'errors.geolocation.notSupported'
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
        search: {
          title: 'home.sections.search.title',
          originLabel: 'home.sections.search.originLabel',
          originPlaceholder: 'home.sections.search.originPlaceholder',
          destinationLabel: 'home.sections.search.destinationLabel',
          destinationPlaceholder: 'home.sections.search.destinationPlaceholder',
          dateLabel: 'home.sections.search.dateLabel',
          submit: 'home.sections.search.submit'
        },
        recentStops: {
          title: 'home.sections.recentStops.title',
          items: [
            'home.sections.recentStops.items.mainStreet',
            'home.sections.recentStops.items.oakwoodPlaza',
            'home.sections.recentStops.items.cityLibrary',
            'home.sections.recentStops.items.centralStation',
            'home.sections.recentStops.items.riverPark',
            'home.sections.recentStops.items.harborPier',
            'home.sections.recentStops.items.universityGate',
            'home.sections.recentStops.items.historicCenter',
            'home.sections.recentStops.items.northTerminal',
            'home.sections.recentStops.items.marketSquare'
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
      },
      dialogs: {
        nearbyStops: {
          title: 'home.dialogs.nearbyStops.title',
          description: 'home.dialogs.nearbyStops.description',
          loading: 'home.dialogs.nearbyStops.loading',
          permissionDenied: 'home.dialogs.nearbyStops.permissionDenied',
          notSupported: 'home.dialogs.nearbyStops.notSupported',
          unknownError: 'home.dialogs.nearbyStops.unknownError',
          empty: 'home.dialogs.nearbyStops.empty',
          retry: 'home.dialogs.nearbyStops.retry',
          close: 'home.dialogs.nearbyStops.close',
          distance: {
            meters: 'home.dialogs.nearbyStops.distance.meters',
            kilometers: 'home.dialogs.nearbyStops.distance.kilometers'
          }
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
  },
  homeData: {
    search: {
      originFieldId: 'home-search-origin',
      destinationFieldId: 'home-search-destination',
      dateFieldId: 'home-search-date'
    },
    recentStops: {
      icon: 'pin_drop',
      maxItems: 10,
      items: [
        'home.sections.recentStops.items.mainStreet',
        'home.sections.recentStops.items.oakwoodPlaza',
        'home.sections.recentStops.items.cityLibrary',
        'home.sections.recentStops.items.centralStation',
        'home.sections.recentStops.items.riverPark',
        'home.sections.recentStops.items.harborPier',
        'home.sections.recentStops.items.universityGate',
        'home.sections.recentStops.items.historicCenter',
        'home.sections.recentStops.items.northTerminal',
        'home.sections.recentStops.items.marketSquare'
      ] as const
    },
    nearbyStops: {
      maxResults: 3,
      stops: [
        {
          id: 'main-street',
          titleKey: 'home.sections.recentStops.items.mainStreet',
          latitude: 37.389092,
          longitude: -5.984459
        },
        {
          id: 'oakwood-plaza',
          titleKey: 'home.sections.recentStops.items.oakwoodPlaza',
          latitude: 37.394932,
          longitude: -5.973099
        },
        {
          id: 'city-library',
          titleKey: 'home.sections.recentStops.items.cityLibrary',
          latitude: 37.39244,
          longitude: -5.992552
        }
      ] as const
    }
  }
} as const;

export type AppConfig = typeof APP_CONFIG;
export type SupportedLanguage = (typeof APP_CONFIG.locales.supported)[number];
