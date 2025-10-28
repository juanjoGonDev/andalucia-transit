import { RouteSearchHistoryStoredEntry } from '@data/route-search/route-search-history.storage';
import { StopFavoriteStoredItem } from '@data/stops/stop-favorites.storage';

const MOCK_FAVORITES: readonly StopFavoriteStoredItem[] = Object.freeze([
  {
    id: '0401301-0001',
    code: '15',
    name: 'Estación Intermodal - ALMERÍA',
    municipality: 'Almería',
    municipalityId: '04013',
    nucleus: 'Almería',
    nucleusId: '0401301',
    consortiumId: 1,
    stopIds: ['04013010001']
  },
  {
    id: '0408502-0002',
    code: '286',
    name: 'La Gangosa - Av. Prado',
    municipality: 'Vícar',
    municipalityId: '04100',
    nucleus: 'La Gangosa',
    nucleusId: '0408502',
    consortiumId: 1,
    stopIds: ['04085020002']
  }
]);

const MOCK_RECENT_SEARCHES: readonly RouteSearchHistoryStoredEntry[] = Object.freeze([
  {
    id: 'recent-2025-10-26-064700',
    executedAt: '2025-10-26T06:47:00.000Z',
    selection: {
      origin: MOCK_FAVORITES[0],
      destination: MOCK_FAVORITES[1],
      queryDate: '2025-10-26T06:47:00.000Z',
      lineMatches: [
        {
          lineId: 'm301',
          lineCode: 'M-301',
          direction: 0,
          originStopIds: ['04013010001'],
          destinationStopIds: ['04085020002']
        }
      ]
    }
  },
  {
    id: 'recent-2025-10-26-054500',
    executedAt: '2025-10-26T05:45:00.000Z',
    selection: {
      origin: MOCK_FAVORITES[0],
      destination: MOCK_FAVORITES[1],
      queryDate: '2025-10-26T05:45:00.000Z',
      lineMatches: [
        {
          lineId: 'm302',
          lineCode: 'M-302',
          direction: 1,
          originStopIds: ['04013010001'],
          destinationStopIds: ['04085020002']
        }
      ]
    }
  }
]);

export function getMockFavoriteStoredItems(): readonly StopFavoriteStoredItem[] {
  return MOCK_FAVORITES.map((favorite) => ({
    ...favorite,
    stopIds: [...favorite.stopIds]
  }));
}

export function getMockRouteSearchHistoryEntries(): readonly RouteSearchHistoryStoredEntry[] {
  return MOCK_RECENT_SEARCHES.map((entry) => ({
    id: entry.id,
    executedAt: entry.executedAt,
    selection: {
      origin: {
        ...entry.selection.origin,
        stopIds: [...entry.selection.origin.stopIds]
      },
      destination: {
        ...entry.selection.destination,
        stopIds: [...entry.selection.destination.stopIds]
      },
      queryDate: entry.selection.queryDate,
      lineMatches: entry.selection.lineMatches.map((match) => ({
        ...match,
        originStopIds: [...match.originStopIds],
        destinationStopIds: [...match.destinationStopIds]
      }))
    }
  }));
}
