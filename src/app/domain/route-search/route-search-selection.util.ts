import {
  StopConnection,
  buildStopConnectionKey
} from '@data/route-search/stop-connections.service';
import { StopDirectoryOption } from '@data/stops/stop-directory.service';
import { RouteSearchLineMatch, RouteSearchSelection } from '@domain/route-search/route-search-state.service';

interface LineAggregate {
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly originIds: Set<string>;
  readonly destinationIds: Set<string>;
}

const EMPTY_MATCHES: readonly RouteSearchLineMatch[] = Object.freeze([] as RouteSearchLineMatch[]);

export function collectRouteLineMatches(
  origin: StopDirectoryOption,
  destination: StopDirectoryOption,
  connections: ReadonlyMap<string, StopConnection>
): readonly RouteSearchLineMatch[] {
  if (!destination.stopIds.length || connections.size === 0) {
    return EMPTY_MATCHES;
  }

  const aggregates = new Map<string, LineAggregate>();

  for (const destinationStopId of destination.stopIds) {
    const connectionKey = buildStopConnectionKey(destination.consortiumId, destinationStopId);
    const connection = connections.get(connectionKey);

    if (!connection) {
      continue;
    }

    const matchingOrigins = connection.originStopIds.filter((stopId) =>
      origin.stopIds.includes(stopId)
    );

    if (!matchingOrigins.length) {
      continue;
    }

    for (const signature of connection.lineSignatures) {
      const key = buildLineKey(signature.lineId, signature.lineCode, signature.direction);
      const aggregate =
        aggregates.get(key) ??
        createAggregate(signature.lineId, signature.lineCode, signature.direction);

      matchingOrigins.forEach((originStopId) => aggregate.originIds.add(originStopId));
      aggregate.destinationIds.add(destinationStopId);
      aggregates.set(key, aggregate);
    }
  }

  if (!aggregates.size) {
    return EMPTY_MATCHES;
  }

  const matches: RouteSearchLineMatch[] = [];

  aggregates.forEach((aggregate) => {
    const orderedOrigins = orderStopIds(origin.stopIds, aggregate.originIds);
    const orderedDestinations = orderStopIds(destination.stopIds, aggregate.destinationIds);

    matches.push({
      lineId: aggregate.lineId,
      lineCode: aggregate.lineCode,
      direction: aggregate.direction,
      originStopIds: orderedOrigins,
      destinationStopIds: orderedDestinations
    });
  });

  return Object.freeze(matches);
}

export function createRouteSearchSelection(
  origin: StopDirectoryOption,
  destination: StopDirectoryOption,
  lineMatches: readonly RouteSearchLineMatch[],
  queryDate: Date
): RouteSearchSelection {
  const normalizedMatches = Object.freeze(
    lineMatches.map((match) => ({
      lineId: match.lineId,
      lineCode: match.lineCode,
      direction: match.direction,
      originStopIds: Object.freeze([...match.originStopIds]),
      destinationStopIds: Object.freeze([...match.destinationStopIds])
    }))
  );

  return {
    origin,
    destination,
    queryDate: new Date(queryDate.getTime()),
    lineMatches: normalizedMatches
  } satisfies RouteSearchSelection;
}

function createAggregate(lineId: string, lineCode: string, direction: number): LineAggregate {
  return {
    lineId,
    lineCode,
    direction,
    originIds: new Set<string>(),
    destinationIds: new Set<string>()
  } satisfies LineAggregate;
}

function orderStopIds(reference: readonly string[], ids: Set<string>): readonly string[] {
  const remaining = new Set(ids);
  const ordered: string[] = [];

  for (const stopId of reference) {
    if (remaining.has(stopId)) {
      ordered.push(stopId);
      remaining.delete(stopId);
    }
  }

  remaining.forEach((stopId) => ordered.push(stopId));

  return Object.freeze(ordered);
}

function buildLineKey(lineId: string, lineCode: string, direction: number): string {
  return `${lineId}|${lineCode}|${direction}`;
}
