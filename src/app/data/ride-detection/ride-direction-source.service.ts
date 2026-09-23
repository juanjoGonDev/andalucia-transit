import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StopScheduleService } from '@data/services/stop-schedule.service';
import {
  RideCandidateStop,
  RideLineDirectionCandidate
} from '@domain/ride-detection/ride-candidates.util';
import { RideDirectionSource } from '@domain/ride-detection/ride-detection.service';

/** How far ahead a service must arrive to count as a live candidate. */
const UPCOMING_WINDOW_MS = 45 * 60_000;
const RECENT_PAST_WINDOW_MS = 5 * 60_000;

/**
 * Live line candidates fetched from the consortium schedule API: every
 * service bound soon from the corridor stop becomes a direction candidate.
 * Itinerary coordinates are not exposed by this endpoint, so direction
 * filtering is left to the pure ranker whenever richer sources arrive.
 */
@Injectable({ providedIn: 'root' })
export class RideDirectionSourceService implements RideDirectionSource {
  private readonly scheduleService = inject(StopScheduleService);

  async fetchDirections(stop: RideCandidateStop): Promise<readonly RideLineDirectionCandidate[]> {
    try {
      const result = await firstValueFrom(
        this.scheduleService.getStopSchedule(stop.stopId, { consortiumId: stop.consortiumId })
      );

      const now = Date.now();

      return result.schedule.services
        .filter((service) => {
          const delta = service.arrivalTime.getTime() - now;
          return delta > -RECENT_PAST_WINDOW_MS && delta <= UPCOMING_WINDOW_MS;
        })
        .map(
          (service): RideLineDirectionCandidate => ({
            lineId: service.lineId,
            lineCode: service.lineCode,
            direction: service.direction,
            destinationName: service.destination,
            upcomingStops: []
          })
        );
    } catch {
      return [];
    }
  }
}
