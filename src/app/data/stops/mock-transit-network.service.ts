import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface StopOption {
  readonly id: string;
  readonly name: string;
  readonly lineIds: readonly string[];
}

export interface StopSearchRequest {
  readonly query: string;
  readonly includeStopIds?: readonly string[];
  readonly excludeStopId?: string;
  readonly limit: number;
}

interface InternalStopDefinition extends StopOption {
  readonly normalizedName: string;
}

interface MockLineDefinition {
  readonly id: string;
  readonly stopIds: readonly string[];
}

interface MockNetwork {
  readonly stops: readonly InternalStopDefinition[];
  readonly stopLookup: ReadonlyMap<string, InternalStopDefinition>;
  readonly reachableMap: ReadonlyMap<string, readonly string[]>;
}

const TOTAL_STOP_COUNT = 1200;
const LINE_COUNT = 18;
const STOPS_PER_LINE = 160;
const LINE_OFFSET_STEP = 45;

@Injectable({ providedIn: 'root' })
export class MockTransitNetworkService {
  private readonly network: MockNetwork = buildMockNetwork();

  searchStops(request: StopSearchRequest): Observable<readonly StopOption[]> {
    const normalizedQuery = request.query.trim().toLocaleLowerCase();
    const allowedStopIds = request.includeStopIds
      ? new Set(request.includeStopIds)
      : null;
    const results: StopOption[] = [];

    for (const stop of this.network.stops) {
      if (request.excludeStopId && stop.id === request.excludeStopId) {
        continue;
      }

      if (allowedStopIds && !allowedStopIds.has(stop.id)) {
        continue;
      }

      if (normalizedQuery && !stop.normalizedName.includes(normalizedQuery)) {
        continue;
      }

      results.push(stop);

      if (results.length >= request.limit) {
        break;
      }
    }

    if (!normalizedQuery && !allowedStopIds) {
      return of(results.slice(0, request.limit));
    }

    return of(results);
  }

  getReachableStopIds(stopId: string): readonly string[] {
    return this.network.reachableMap.get(stopId) ?? [];
  }

  getStopById(stopId: string): StopOption | null {
    return this.network.stopLookup.get(stopId) ?? null;
  }
}

function buildMockNetwork(): MockNetwork {
  const stops = buildStops();
  const lines = buildLines(stops);
  const stopLookup = new Map<string, InternalStopDefinition>();
  const stopToLines = new Map<string, Set<string>>();
  const lineToStops = new Map<string, readonly string[]>();

  for (const stop of stops) {
    stopLookup.set(stop.id, stop);
  }

  for (const line of lines) {
    lineToStops.set(line.id, line.stopIds);

    for (const stopId of line.stopIds) {
      if (!stopLookup.has(stopId)) {
        continue;
      }

      const assignedLines = stopToLines.get(stopId);

      if (assignedLines) {
        assignedLines.add(line.id);
        continue;
      }

      stopToLines.set(stopId, new Set([line.id]));
    }
  }

  const enrichedStops: InternalStopDefinition[] = stops.map((stop) => ({
    ...stop,
    lineIds: Object.freeze([...(stopToLines.get(stop.id) ?? [])])
  }));

  const reachableMap = new Map<string, readonly string[]>();

  for (const stop of enrichedStops) {
    const reachableIds = new Set<string>();

    for (const lineId of stop.lineIds) {
      const lineStops = lineToStops.get(lineId) ?? [];

      for (const relatedStopId of lineStops) {
        if (relatedStopId !== stop.id) {
          reachableIds.add(relatedStopId);
        }
      }
    }

    const orderedReachable = [...reachableIds].sort();
    reachableMap.set(stop.id, Object.freeze(orderedReachable));
  }

  return {
    stops: enrichedStops,
    stopLookup,
    reachableMap
  };
}

function buildStops(): InternalStopDefinition[] {
  return Array.from({ length: TOTAL_STOP_COUNT }, (_, index) => {
    const identifier = index + 1;
    const name = `Stop ${identifier.toString().padStart(4, '0')}`;
    const normalizedName = name.toLocaleLowerCase();

    return {
      id: `stop-${identifier}`,
      name,
      normalizedName,
      lineIds: []
    } satisfies InternalStopDefinition;
  });
}

function buildLines(stops: readonly InternalStopDefinition[]): MockLineDefinition[] {
  const lines: MockLineDefinition[] = [];
  const stopCount = stops.length;

  for (let lineIndex = 0; lineIndex < LINE_COUNT; lineIndex += 1) {
    const startIndex = (lineIndex * LINE_OFFSET_STEP) % stopCount;
    const stopIds: string[] = [];

    for (let offset = 0; offset < STOPS_PER_LINE; offset += 1) {
      const stopIndex = (startIndex + offset) % stopCount;
      stopIds.push(stops[stopIndex].id);
    }

    lines.push({
      id: `line-${lineIndex + 1}`,
      stopIds: Object.freeze(stopIds)
    });
  }

  return lines;
}
