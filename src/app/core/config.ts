const STOP_DETAIL_BASE_SEGMENT = 'stop-detail' as const;
const STOP_ID_ROUTE_PARAM = 'stopId' as const;
const STOP_INFO_BASE_SEGMENT = 'stop-info' as const;
const STOP_INFO_CONSORTIUM_PARAM = 'consortiumId' as const;
const STOP_INFO_STOP_PARAM = 'stopNumber' as const;
const ROUTE_SEARCH_BASE_SEGMENT = 'routes' as const;
const ROUTE_SEARCH_CONNECTOR_SEGMENT = 'to' as const;
const ROUTE_SEARCH_DATE_SEGMENT = 'on' as const;
const ROUTE_SEARCH_ORIGIN_PARAM = 'originSlug' as const;
const ROUTE_SEARCH_DESTINATION_PARAM = 'destinationSlug' as const;
const ROUTE_SEARCH_DATE_PARAM = 'dateSlug' as const;
const ROUTE_SEARCH_ORIGIN_QUERY_PARAM = 'originStopId' as const;
const NEWS_ROUTE_SEGMENT = 'news' as const;
const DATA_PROVIDER_NAME =
  'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía' as const;
const DATA_TIMEZONE = 'Europe/Madrid' as const;
const STOP_SERVICES_SNAPSHOT_PATH = 'assets/data/snapshots/stop-services/latest.json' as const;
const STOP_DIRECTORY_SNAPSHOT_PATH = 'assets/data/stop-directory/index.json' as const;
const NEWS_FEED_SNAPSHOT_PATH = 'assets/data/news/feed.json' as const;
const RUNTIME_FLAGS_PROPERTY = '__ANDALUCIA_TRANSIT_FLAGS__' as const;
const HOLIDAY_API_BASE_URL = 'https://date.nager.at/api/v3' as const;
const HOLIDAY_COUNTRY_CODE = 'ES' as const;
const HOLIDAY_REGION_CODES = ['ES-AN'] as const;
const ROUTE_SEARCH_HISTORY_STORAGE_KEY = 'andalucia-transit.routeSearchHistory' as const;
const ROUTE_SEARCH_PREFERENCES_STORAGE_KEY = 'andalucia-transit.routeSearchPreferences' as const;
const STOP_FAVORITES_STORAGE_KEY = 'andalucia-transit.stopFavorites' as const;
const ROUTE_SEARCH_SCHEDULE_ACCURACY_THRESHOLD_DAYS = 30 as const;
const HOME_RECENT_ROUTE = 'recents' as const;
const HOME_FAVORITES_ROUTE = 'favs' as const;
const LOCALE_ES_STANDARD = 'es-ES' as const;
const LOCALE_EN_STANDARD = 'en-GB' as const;
const LANGUAGE_LOCALE_MAP = {
  es: LOCALE_ES_STANDARD,
  en: LOCALE_EN_STANDARD
} as const;

export const APP_CONFIG = {
  appName: 'Andalucia Transit',
  apiBaseUrl: 'https://api.ctan.es',
  locales: {
    default: 'es',
    fallback: 'es',
    storageKey: 'andalucia-transit.language',
    supported: ['es', 'en'] as const,
    dateLocales: LANGUAGE_LOCALE_MAP,
    assetsPath: 'assets/i18n/',
    fileExtension: '.json'
  },
  formats: {
    isoDate: 'yyyy-MM-dd'
  },
  runtime: {
    flagsProperty: RUNTIME_FLAGS_PROPERTY
  },
  routeSearchData: {
    scheduleAccuracy: {
      warningThresholdDays: ROUTE_SEARCH_SCHEDULE_ACCURACY_THRESHOLD_DAYS
    },
    queryParams: {
      originStopId: ROUTE_SEARCH_ORIGIN_QUERY_PARAM
    }
  },
  home: {},
  routes: {
    home: '' as const,
    homeRecent: HOME_RECENT_ROUTE,
    homeFavorites: HOME_FAVORITES_ROUTE,
    stopDetailBase: STOP_DETAIL_BASE_SEGMENT,
    stopDetailPattern: `${STOP_DETAIL_BASE_SEGMENT}/:${STOP_ID_ROUTE_PARAM}` as const,
    stopInfoBase: STOP_INFO_BASE_SEGMENT,
    stopInfoPattern: `${STOP_INFO_BASE_SEGMENT}/:${STOP_INFO_CONSORTIUM_PARAM}/:${STOP_INFO_STOP_PARAM}` as const,
    routeSearch: ROUTE_SEARCH_BASE_SEGMENT,
    routeSearchResultPattern:
      `${ROUTE_SEARCH_BASE_SEGMENT}/:${ROUTE_SEARCH_ORIGIN_PARAM}/${ROUTE_SEARCH_CONNECTOR_SEGMENT}/:${ROUTE_SEARCH_DESTINATION_PARAM}/${ROUTE_SEARCH_DATE_SEGMENT}/:${ROUTE_SEARCH_DATE_PARAM}` as const,
    map: 'map' as const,
    settings: 'settings' as const,
    favorites: 'favorites' as const,
    news: NEWS_ROUTE_SEGMENT
  },
  routeSegments: {
    routeSearch: {
      connector: ROUTE_SEARCH_CONNECTOR_SEGMENT,
      date: ROUTE_SEARCH_DATE_SEGMENT
    }
  },
  routeParams: {
    stopId: STOP_ID_ROUTE_PARAM,
    stopInfo: {
      consortiumId: STOP_INFO_CONSORTIUM_PARAM,
      stopNumber: STOP_INFO_STOP_PARAM
    },
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
      lines: 'navigation.lines',
      favorites: 'navigation.favorites',
      news: 'navigation.news',
      stopInfo: 'navigation.stopInfo'
    },
    languages: {
      es: 'languages.es',
      en: 'languages.en'
    },
    home: {
      header: {
        title: 'home.header.title',
        tagline: 'home.header.tagline',
        infoLabel: 'home.header.infoLabel'
      },
      hero: {
        eyebrow: 'home.hero.eyebrow',
        description: 'home.hero.description',
        action: 'home.hero.action'
      },
      topBar: {
        settingsLabel: 'home.topBar.settingsLabel',
        menuLabel: 'home.topBar.menuLabel',
        mapLabel: 'home.topBar.mapLabel'
      },
      tabs: {
        search: 'home.tabs.search',
        recent: 'home.tabs.recent',
        favorites: 'home.tabs.favorites',
        nearby: 'home.tabs.nearby',
        settings: 'home.tabs.settings'
      },
      menu: {
        recent: 'home.menu.recent',
        favorites: 'home.menu.favorites',
        news: 'home.menu.news',
        nearby: 'home.menu.nearby',
        settings: 'home.menu.settings',
        inProgress: 'home.menu.inProgress'
      },
      summary: {
        lastSearch: 'home.summary.lastSearch',
        seeAll: 'home.summary.seeAll',
        empty: 'home.summary.empty'
      },
      quickActions: {
        nearby: 'home.quickActions.nearby'
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
          noRoutes: 'home.sections.search.noRoutes',
          nearbyGroupLabel: 'home.sections.search.nearbyGroupLabel',
          originLocationActionLabel: 'home.sections.search.originLocationActionLabel',
          favoritesGroupLabel: 'home.sections.search.favoritesGroupLabel',
          addFavoriteLabel: 'home.sections.search.addFavoriteLabel',
          removeFavoriteLabel: 'home.sections.search.removeFavoriteLabel'
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
          description: 'home.sections.findNearby.description',
          action: 'home.sections.findNearby.action',
          hint: 'home.sections.findNearby.hint'
        },
        favorites: {
          title: 'home.sections.favorites.title',
          description: 'home.sections.favorites.description',
          action: 'home.sections.favorites.action',
          empty: 'home.sections.favorites.empty'
        },
        settings: {
          title: 'home.sections.settings.title',
          description: 'home.sections.settings.description',
          action: 'home.sections.settings.action',
          hint: 'home.sections.settings.hint'
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
            cancel: 'home.dialogs.recentStops.remove.cancel',
            details: {
              origin: 'home.dialogs.recentStops.remove.details.origin',
              destination: 'home.dialogs.recentStops.remove.details.destination'
            }
          },
          clearAll: {
            title: 'home.dialogs.recentStops.clearAll.title',
            message: 'home.dialogs.recentStops.clearAll.message',
            confirm: 'home.dialogs.recentStops.clearAll.confirm',
            cancel: 'home.dialogs.recentStops.clearAll.cancel',
            details: {
              count: 'home.dialogs.recentStops.clearAll.details.count'
            }
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
      actions: {
        stopInfo: 'stopDetail.actions.stopInfo'
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
      locate: 'map.locate',
      locating: 'map.locating',
      panelTitle: 'map.panelTitle',
      permissionPrompt: 'map.permissionPrompt',
      accessibleMapLabel: 'map.accessibleMapLabel',
      empty: 'map.empty',
      stopAriaLabel: 'map.stopAriaLabel',
      errors: {
        permissionDenied: 'map.errors.permissionDenied',
        positionUnavailable: 'map.errors.positionUnavailable',
        timeout: 'map.errors.timeout',
        generic: 'map.errors.generic'
      },
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
    },
    news: {
      title: 'news.title',
      description: 'news.description',
      updatedLabel: 'news.updatedLabel',
      readMore: 'news.readMore',
      empty: 'news.empty',
      refresh: 'news.refresh'
    },
    stopInfo: {
      title: 'stopInfo.title',
      description: 'stopInfo.description',
      actions: {
        refresh: 'stopInfo.actions.refresh'
      },
      status: {
        loading: 'stopInfo.status.loading',
        offline: 'stopInfo.status.offline',
        notFound: 'stopInfo.status.notFound',
        error: 'stopInfo.status.error'
      },
      labels: {
        stopNumber: 'stopInfo.labels.stopNumber',
        stopCode: 'stopInfo.labels.stopCode',
        municipality: 'stopInfo.labels.municipality',
        nucleus: 'stopInfo.labels.nucleus',
        zone: 'stopInfo.labels.zone',
        description: 'stopInfo.labels.description',
        observations: 'stopInfo.labels.observations',
        correspondences: 'stopInfo.labels.correspondences',
        location: 'stopInfo.labels.location',
        status: 'stopInfo.labels.status'
      },
      tags: {
        main: 'stopInfo.tags.main',
        inactive: 'stopInfo.tags.inactive'
      }
    },
    favorites: {
      title: 'favorites.title',
      description: 'favorites.description',
      searchLabel: 'favorites.search.label',
      searchPlaceholder: 'favorites.search.placeholder',
      empty: 'favorites.empty',
      list: {
        code: 'favorites.list.code',
        nucleus: 'favorites.list.nucleus'
      },
      actions: {
        clearAll: 'favorites.actions.clearAll',
        remove: 'favorites.actions.remove'
      },
      dialogs: {
        remove: {
          title: 'favorites.dialogs.remove.title',
          message: 'favorites.dialogs.remove.message',
          confirm: 'favorites.dialogs.remove.confirm',
          cancel: 'favorites.dialogs.remove.cancel'
        },
        clearAll: {
          title: 'favorites.dialogs.clearAll.title',
          message: 'favorites.dialogs.clearAll.message',
          confirm: 'favorites.dialogs.clearAll.confirm',
          cancel: 'favorites.dialogs.clearAll.cancel'
        },
        details: {
          name: 'favorites.dialogs.details.name',
          code: 'favorites.dialogs.details.code',
          count: 'favorites.dialogs.details.count'
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
      debounceMs: 150,
      nearbyGroupId: 'nearby' as const
    },
    recentStops: {
      maxItems: 10,
      storageKey: ROUTE_SEARCH_HISTORY_STORAGE_KEY,
      preferences: {
        storageKey: ROUTE_SEARCH_PREFERENCES_STORAGE_KEY,
        previewEnabledDefault: true
      }
    },
    nearbyStops: {
      maxDistanceInMeters: 3_000,
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
      storageKey: STOP_FAVORITES_STORAGE_KEY,
      icon: 'star' as const,
      activeIcon: 'star' as const,
      inactiveIcon: 'star_border' as const,
      removeIcon: 'delete' as const,
      homePreviewLimit: 3
    }
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
    },
    news: {
      feedPath: NEWS_FEED_SNAPSHOT_PATH
    }
  }
} as const;

export type AppConfig = typeof APP_CONFIG;
export type SupportedLanguage = (typeof APP_CONFIG.locales.supported)[number];
