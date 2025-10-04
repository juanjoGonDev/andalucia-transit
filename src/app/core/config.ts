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
    recentStops: [
      {
        titleKey: 'home.sections.recentStops.items.mainStreet',
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCKH4B7MR-C7r8NwbViwBMhN3ALOf4e7az-ZKOGEZ3uhDS-olIWOt0UFF5VRFqKmn2rfKCGwPV7sbRBWEBF3AoUIItT8RS3oxA-KVQe6gFpzWiHDYii5VkpAmFXrGp1AAZhf4SA0wixY6dGSm9Bb6OibIA0m0IFQQj01akvm4Gp3JleDm7-MI0Z288mE4i-y8wdLgCU8kz7M9dQyawcgU0JsJpsgTQnCzv4rJZuTaUedE--AA6PEysVvqMySAb68GvFDQJb5XsynJcO'
      },
      {
        titleKey: 'home.sections.recentStops.items.oakwoodPlaza',
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD4uyAfwVMEJ622qE8sa5jwfCZfdmJ5HdGhVqImKILKLFI-ZgP93aiktvaQNlIjAIFMGLTxZBqJIuRF0LzSq20ceDZLC-MpVHb0VV-aZNnbGDbYeIZt-5mfle4054nYAjpY8hRcRWujKzJ3yu87VxSupCqZV6Bz_cv4Cb-_INF6jm-V-PRPrqtCdjG5OAFj2dLYI6W5BDiAF5p8RkE1Km9j7vpr65rWlIzOYTb4bzrHqwXUW3Vd-gzTCnK3DMMdUGOZso2M-EO5p8jm'
      },
      {
        titleKey: 'home.sections.recentStops.items.cityLibrary',
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuB_QMxQ_R2lULRvksQDizwK3dVfKIs6ZQ4KxI-d9Ch6musQNmpIDk1HcuthpGZ0D0khQibM6imJqbQ24SAraBI3axtQBbSaKcVdFDk4lepXxXqnjPJzuZs28XNfnK71dDPz6Q-38aOjEgvHOSWqtQUh9vZ_QB7tD8DuQxHT9-HergNRVD3aqK3OQB810xaVGfT9QrfESQjfjPBjs0BJT1MoZ1c-wKxUelrVe1N8RYHFiOquahzC490uSK0fNaLyuTuBtQJ6E2_7q38P'
      }
    ] as const,
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
