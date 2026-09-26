import { GeoCoordinate, calculateDistanceInMeters } from '@domain/utils/geo-distance.util';
import { angularGapDeg, initialBearingDeg } from './ride-detection.util';

/** A stop reached by the ride radius scan (directory snapshot). */
export interface RideCandidateStop {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopName: string;
  readonly location: GeoCoordinate;
  readonly distanceMeters: number;
}

/** A line direction reachable from a stop, used to filter by travel heading. */
export interface RideLineDirectionCandidate {
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destinationName: string;
  /** Ordered upcoming stops after the candidate stop, when known. */
  readonly upcomingStops: readonly GeoCoordinate[];
}

export interface RideLineProposal {
  readonly consortiumId: number;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destinationName: string;
  /** Number of scanned stops serving this line inside the corridor. */
  readonly matches: number;
  /** Average distance of agreeing stops to the user position. */
  readonly closestStopMeters: number;
  /** True when the line itinerary heads the same way as the user. */
  readonly directionAgrees: boolean;
  /** Aggregated 0..1 confidence used to rank proposals. */
  readonly score: number;
  /** Stops contributing to the proposal, ordered by proximity to the user. */
  readonly stopIds: readonly string[];
}

/**
 * Timetable view the user currently has on screen (a stop schedule, a route search
 * result, ...). While an open view matches a ride proposal the floating suggestion is
 * redundant and must stay hidden.
 */
export interface RideOpenScheduleContext {
  readonly consortiumId: number | null;
  readonly stopIds?: readonly string[];
  readonly lineIds?: readonly string[];
}

/** True when the proposal points at a line or stop the open schedule already shows. */
export function rideProposalMatchesOpenSchedule(
  proposal: RideLineProposal,
  context: RideOpenScheduleContext,
): boolean {
  if (context.consortiumId !== null && context.consortiumId !== proposal.consortiumId) {
    return false;
  }

  const lineMatch = context.lineIds?.includes(proposal.lineId) ?? false;
  const stopMatch = context.stopIds?.some((stopId) => proposal.stopIds.includes(stopId)) ?? false;

  return lineMatch || stopMatch;
}

export interface RideCandidateOptions {
  /** Angular tolerance accepted between travel heading and line itinerary. */
  readonly maxBearingGapDeg: number;
  readonly maxProposals: number;
}

export const RIDE_CANDIDATE_DEFAULTS: RideCandidateOptions = {
  maxBearingGapDeg: 75,
  maxProposals: 3,
};

/**
 * Ranks line candidates for a moving user.
 *
 * Inputs:
 * - stops inside the ride corridor (already radius-filtered), and
 * - per-stop line directions with their next-stop waypoints.
 * The user heading comes from the GPS history; candidates whose itinerary
 * heads the opposite way are dropped, and consolidation merges every stop hit
 * per line+direction into a single proposal ordered by agreement matches,
 * proximity and direction fit.
 */
export function rankRideCandidates(
  stops: readonly RideCandidateStop[],
  directionsByStop: Readonly<Record<string, readonly RideLineDirectionCandidate[]>>,
  userBearingDeg: number,
  options: RideCandidateOptions = RIDE_CANDIDATE_DEFAULTS,
): RideLineProposal[] {
  const proposals = new Map<string, RideLineProposal>();

  for (const stop of stops) {
    const stopDirections = directionsByStop[`${stop.consortiumId}:${stop.stopId}`];

    if (!stopDirections || stopDirections.length === 0) {
      continue;
    }

    for (const direction of stopDirections) {
      const directionAgrees = itineraryAgreesWithHeading(
        stop.location,
        direction.upcomingStops,
        userBearingDeg,
        options.maxBearingGapDeg,
      );

      if (!directionAgrees) {
        continue;
      }

      const key = `${stop.consortiumId}:${direction.lineId}:${direction.direction}`;
      const existing = proposals.get(key);

      if (!existing) {
        proposals.set(key, {
          consortiumId: stop.consortiumId,
          lineId: direction.lineId,
          lineCode: direction.lineCode,
          direction: direction.direction,
          destinationName: direction.destinationName,
          matches: 1,
          closestStopMeters: stop.distanceMeters,
          directionAgrees,
          score: 0,
          stopIds: [stop.stopId],
        });
        continue;
      }

      proposals.set(key, {
        ...existing,
        matches: existing.matches + 1,
        closestStopMeters: Math.min(existing.closestStopMeters, stop.distanceMeters),
        stopIds: [...existing.stopIds, stop.stopId],
      });
    }
  }

  return [...proposals.values()]
    .map((proposal) => ({
      ...proposal,
      score: scoreProposal(proposal),
    }))
    .sort((a, b) => {
      if (b.matches !== a.matches) {
        return b.matches - a.matches;
      }

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.closestStopMeters - b.closestStopMeters;
    })
    .slice(0, options.maxProposals);
}

/** Groups stop radius hits by whether a given stop serves participating lines. */
function itineraryAgreesWithHeading(
  stopLocation: GeoCoordinate,
  upcomingStops: readonly GeoCoordinate[],
  userBearingDeg: number,
  maxGapDeg: number,
): boolean {
  if (upcomingStops.length === 0) {
    // Direction unknown (tail of itinerary): accept, proximity rules the rank.
    return true;
  }

  const next = upcomingStops[0];
  if (!next) {
    return true;
  }

  const legBearing = initialBearingDeg(stopLocation, next);
  return angularGapDeg(userBearingDeg, legBearing) <= maxGapDeg;
}

/** 0..1 score: matches dominate + proximity bonus. */
function scoreProposal(proposal: Omit<RideLineProposal, 'score'>): number {
  const matchScore = Math.min(proposal.matches, 3) / 3;
  const proximityScore = 1 - Math.min(proposal.closestStopMeters, 1_000) / 1_000;
  return matchScore * 0.7 + proximityScore * 0.3;
}

/** Picks stops nearest to the user's fix, radius-filtered and distance-sorted. */
export function selectCorridorStops(
  allStops: readonly (RideCandidateStop & { readonly distanceMeters: number })[],
  maxMeters: number,
  maxStops: number,
): readonly RideCandidateStop[] {
  return allStops
    .filter((stop) => stop.distanceMeters <= maxMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, maxStops);
}

/** Radius filter with precomputed distances. */
export function filterStopsWithinMeters(
  stops: readonly Omit<RideCandidateStop, 'distanceMeters'>[],
  center: GeoCoordinate,
  radiusMeters: number,
): RideCandidateStop[] {
  return stops
    .map((stop) => ({
      ...stop,
      distanceMeters: calculateDistanceInMeters(center, stop.location),
    }))
    .filter((stop) => stop.distanceMeters <= radiusMeters);
}
