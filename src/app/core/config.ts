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
  routes: {
    home: '' as const,
    stopDetailBase: STOP_DETAIL_BASE_SEGMENT,
    stopDetailPattern: `${STOP_DETAIL_BASE_SEGMENT}/:${STOP_ID_ROUTE_PARAM}` as const,
    routeSearch: ROUTE_SEARCH_BASE_SEGMENT,
    routeSearchResultPattern:
      `${ROUTE_SEARCH_BASE_SEGMENT}/:${ROUTE_SEARCH_ORIGIN_PARAM}/${ROUTE_SEARCH_CONNECTOR_SEGMENT}/:${ROUTE_SEARCH_DESTINATION_PARAM}/${ROUTE_SEARCH_DATE_SEGMENT}/:${ROUTE_SEARCH_DATE_PARAM}` as const,
    map: 'map' as const
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
      estimateNotice: 'routeSearch.estimateNotice'
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
      dateFieldId: 'home-search-date',
      maxAutocompleteOptions: 50,
      debounceMs: 150
    },
    recentStops: {
      icon: 'pin_drop' as const,
      maxItems: 10,
      items: [
        {
          id: 'stop-main-street',
          titleKey: 'home.sections.recentStops.items.mainStreet'
        },
        {
          id: 'stop-oakwood-plaza',
          titleKey: 'home.sections.recentStops.items.oakwoodPlaza'
        },
        {
          id: 'stop-city-library',
          titleKey: 'home.sections.recentStops.items.cityLibrary'
        },
        {
          id: 'stop-central-station',
          titleKey: 'home.sections.recentStops.items.centralStation'
        },
        {
          id: 'stop-river-park',
          titleKey: 'home.sections.recentStops.items.riverPark'
        },
        {
          id: 'stop-harbor-pier',
          titleKey: 'home.sections.recentStops.items.harborPier'
        },
        {
          id: 'stop-university-gate',
          titleKey: 'home.sections.recentStops.items.universityGate'
        },
        {
          id: 'stop-historic-center',
          titleKey: 'home.sections.recentStops.items.historicCenter'
        },
        {
          id: 'stop-north-terminal',
          titleKey: 'home.sections.recentStops.items.northTerminal'
        },
        {
          id: 'stop-market-square',
          titleKey: 'home.sections.recentStops.items.marketSquare'
        }
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
