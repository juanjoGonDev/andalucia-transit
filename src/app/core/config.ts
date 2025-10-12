const STOP_DETAIL_BASE_SEGMENT = 'stop-detail' as const;
const STOP_ID_ROUTE_PARAM = 'stopId' as const;
const ROUTE_SEARCH_BASE_SEGMENT = 'routes' as const;
const ROUTE_SEARCH_CONNECTOR_SEGMENT = 'to' as const;
const ROUTE_SEARCH_DATE_SEGMENT = 'on' as const;
const ROUTE_SEARCH_ORIGIN_PARAM = 'originSlug' as const;
const ROUTE_SEARCH_DESTINATION_PARAM = 'destinationSlug' as const;
const ROUTE_SEARCH_DATE_PARAM = 'dateSlug' as const;
const DATA_PROVIDER_NAME =
  'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía' as const;
const DATA_TIMEZONE = 'Europe/Madrid' as const;
const STOP_SERVICES_SNAPSHOT_PATH = 'assets/data/snapshots/stop-services/latest.json' as const;
const STOP_DIRECTORY_SNAPSHOT_PATH = 'assets/data/stop-directory/index.json' as const;
const RUNTIME_FLAGS_PROPERTY = '__ANDALUCIA_TRANSIT_FLAGS__' as const;
const HOLIDAY_API_BASE_URL = 'https://date.nager.at/api/v3' as const;
const HOLIDAY_COUNTRY_CODE = 'ES' as const;
const HOLIDAY_REGION_CODES = ['ES-AN'] as const;
const ROUTE_SEARCH_HISTORY_STORAGE_KEY = 'andalucia-transit.routeSearchHistory' as const;
const ROUTE_SEARCH_PREFERENCES_STORAGE_KEY = 'andalucia-transit.routeSearchPreferences' as const;
const ROUTE_SEARCH_SCHEDULE_ACCURACY_THRESHOLD_DAYS = 30 as const;

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
  data: {
    providerName: DATA_PROVIDER_NAME,
    timezone: DATA_TIMEZONE,
    snapshots: {
      stopServicesPath: STOP_SERVICES_SNAPSHOT_PATH,
      stopDirectoryPath: STOP_DIRECTORY_SNAPSHOT_PATH
    },
    holidays: {
      apiBaseUrl: HOLIDAY_API_BASE_URL,
      countryCode: HOLIDAY_COUNTRY_CODE,
      regionCodes: HOLIDAY_REGION_CODES
    }
  },
  runtime: {
    flagsProperty: RUNTIME_FLAGS_PROPERTY
  },
  routeSearchData: {
    scheduleAccuracy: {
      warningThresholdDays: ROUTE_SEARCH_SCHEDULE_ACCURACY_THRESHOLD_DAYS
    }
  },
  routes: {
    home: '' as const,
    stopDetailBase: STOP_DETAIL_BASE_SEGMENT,
    stopDetailPattern: `${STOP_DETAIL_BASE_SEGMENT}/:${STOP_ID_ROUTE_PARAM}` as const,
    routeSearch: ROUTE_SEARCH_BASE_SEGMENT,
    routeSearchResultPattern:
      `${ROUTE_SEARCH_BASE_SEGMENT}/:${ROUTE_SEARCH_ORIGIN_PARAM}/${ROUTE_SEARCH_CONNECTOR_SEGMENT}/:${ROUTE_SEARCH_DESTINATION_PARAM}/${ROUTE_SEARCH_DATE_SEGMENT}/:${ROUTE_SEARCH_DATE_PARAM}` as const,
    map: 'map' as const,
    settings: 'settings' as const
  },
  routeSegments: {
    routeSearch: {
      connector: ROUTE_SEARCH_CONNECTOR_SEGMENT,
      date: ROUTE_SEARCH_DATE_SEGMENT
    }
  },
  routeParams: {
    stopId: STOP_ID_ROUTE_PARAM,
    routeSearch: {
      origin: ROUTE_SEARCH_ORIGIN_PARAM,
      destination: ROUTE_SEARCH_DESTINATION_PARAM,
      date: ROUTE_SEARCH_DATE_PARAM
    }
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
      settings: 'navigation.settings',
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
          submit: 'home.sections.search.submit',
          swapLabel: 'home.sections.search.swapLabel',
          noRoutes: 'home.sections.search.noRoutes'
        },
        recentStops: {
          title: 'home.sections.recentStops.title',
          empty: 'home.sections.recentStops.empty',
          searchDate: 'home.sections.recentStops.searchDate',
          searchDateToday: 'home.sections.recentStops.searchDateToday',
          next: 'home.sections.recentStops.next',
          previous: 'home.sections.recentStops.previous',
          previewLoading: 'home.sections.recentStops.previewLoading',
          previewError: 'home.sections.recentStops.previewError',
          noPreview: 'home.sections.recentStops.noPreview',
          previewDisabled: 'home.sections.recentStops.previewDisabled',
          actions: {
            clearAll: 'home.sections.recentStops.actions.clearAll',
            remove: 'home.sections.recentStops.actions.remove'
          }
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
        },
        recentStops: {
          remove: {
            title: 'home.dialogs.recentStops.remove.title',
            message: 'home.dialogs.recentStops.remove.message',
            confirm: 'home.dialogs.recentStops.remove.confirm',
            cancel: 'home.dialogs.recentStops.remove.cancel'
          },
          clearAll: {
            title: 'home.dialogs.recentStops.clearAll.title',
            message: 'home.dialogs.recentStops.clearAll.message',
            confirm: 'home.dialogs.recentStops.clearAll.confirm',
            cancel: 'home.dialogs.recentStops.clearAll.cancel'
          }
        }
      }
    },
    stopDetail: {
      title: 'stopDetail.title',
      subtitle: 'stopDetail.subtitle',
      loading: 'stopDetail.loading',
      error: {
        title: 'stopDetail.error.title',
        description: 'stopDetail.error.description'
      },
      header: {
        stopCodeLabel: 'stopDetail.header.stopCodeLabel',
        scheduleDateLabel: 'stopDetail.header.scheduleDateLabel',
        lastUpdatedLabel: 'stopDetail.header.lastUpdatedLabel'
      },
      filters: {
        destinationLabel: 'stopDetail.filters.destinationLabel',
        allDestinations: 'stopDetail.filters.allDestinations'
      },
      schedule: {
        upcomingTitle: 'stopDetail.schedule.upcomingTitle',
        upcomingSubtitle: 'stopDetail.schedule.upcomingSubtitle',
        pastTitle: 'stopDetail.schedule.pastTitle',
        pastSubtitle: 'stopDetail.schedule.pastSubtitle',
        emptyUpcoming: 'stopDetail.schedule.emptyUpcoming',
        emptyPast: 'stopDetail.schedule.emptyPast'
      },
      status: {
        arrivesIn: 'stopDetail.status.arrivesIn',
        arrivingNow: 'stopDetail.status.arrivingNow',
        departedAgo: 'stopDetail.status.departedAgo'
      },
      badges: {
        accessible: 'stopDetail.badges.accessible',
        universityOnly: 'stopDetail.badges.universityOnly'
      },
      source: {
        live: 'stopDetail.source.live',
        snapshot: 'stopDetail.source.snapshot'
      }
    },
    routeSearch: {
      title: 'routeSearch.title',
      description: 'routeSearch.description',
      action: 'routeSearch.action',
      results: 'routeSearch.results',
      originLabel: 'routeSearch.originLabel',
      destinationLabel: 'routeSearch.destinationLabel',
      dateLabel: 'routeSearch.dateLabel',
      sampleResult: 'routeSearch.sampleResult',
      backLabel: 'routeSearch.backLabel',
      upcomingLabel: 'routeSearch.upcomingLabel',
      pastLabel: 'routeSearch.pastLabel',
      nextBadge: 'routeSearch.nextBadge',
      previousBadge: 'routeSearch.previousBadge',
      noUpcoming: 'routeSearch.noUpcoming',
      changeDate: 'routeSearch.changeDate',
      emptyResults: 'routeSearch.emptyResults',
      arrivalAt: 'routeSearch.arrivalAt',
      travelDuration: 'routeSearch.travelDuration',
      holidayBadge: 'routeSearch.holidayBadge',
      estimateNotice: 'routeSearch.estimateNotice',
      pastSearchNotice: 'routeSearch.pastSearchNotice',
      searchToday: 'routeSearch.searchToday',
      scheduleAccuracyWarning: 'routeSearch.scheduleAccuracyWarning'
    },
    map: {
      title: 'map.title',
      description: 'map.description',
      openList: 'map.openList',
      hint: 'map.hint'
    },
    settings: {
      title: 'settings.title',
      sections: {
        language: {
          title: 'settings.sections.language.title',
          description: 'settings.sections.language.description',
          actionLabel: 'settings.sections.language.actionLabel',
          activeLabel: 'settings.sections.language.activeLabel'
        },
        recentSearches: {
          title: 'settings.sections.recentSearches.title',
          description: 'settings.sections.recentSearches.description',
          previewToggleLabel: 'settings.sections.recentSearches.previewToggleLabel'
        },
        application: {
          title: 'settings.sections.application.title',
          versionLabel: 'settings.sections.application.versionLabel'
        }
      }
    }
  },
  homeData: {
    search: {
      originFieldId: 'home-search-origin',
      destinationFieldId: 'home-search-destination',
      dateFieldId: 'home-search-date',
      maxAutocompleteOptions: 50,
      debounceMs: 150
    },
    recentStops: {
      icon: 'pin_drop' as const,
      maxItems: 10,
      storageKey: ROUTE_SEARCH_HISTORY_STORAGE_KEY,
      preferences: {
        storageKey: ROUTE_SEARCH_PREFERENCES_STORAGE_KEY,
        previewEnabledDefault: true
      }
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
    },
    favoriteStops: {
      items: [
        {
          id: 'stop-uptown-terminal',
          titleKey: 'home.sections.favorites.items.uptown.title',
          subtitleKey: 'home.sections.favorites.items.uptown.subtitle',
          leadingIcon: 'directions_bus'
        },
        {
          id: 'stop-east-market',
          titleKey: 'home.sections.favorites.items.eastMarket.title',
          subtitleKey: 'home.sections.favorites.items.eastMarket.subtitle',
          leadingIcon: 'mail'
        }
      ] as const
    }
  }
} as const;

export type AppConfig = typeof APP_CONFIG;
export type SupportedLanguage = (typeof APP_CONFIG.locales.supported)[number];
