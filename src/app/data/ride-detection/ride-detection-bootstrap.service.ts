import { Injectable, inject } from '@angular/core';
import { RideDirectionSourceService } from '@data/ride-detection/ride-direction-source.service';
import { RideStopsIndexService } from '@data/ride-detection/ride-stops-index.service';
import { RideDetectionService } from '@domain/ride-detection/ride-detection.service';

/**
 * Wires the ride detection domain coordinator with the data-layer adapters
 * (stop directory snapshot + live timetable API) and starts the GPS watcher.
 * Called once from the app layout bootstrap.
 */
@Injectable({ providedIn: 'root' })
export class RideDetectionBootstrapService {
  private readonly detection = inject(RideDetectionService);
  private readonly stopsIndex = inject(RideStopsIndexService);
  private readonly directions = inject(RideDirectionSourceService);

  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.detection.configure({
      stopsIndex: (center) => this.stopsIndex.stopsWithin(center),
      directions: this.directions
    });

    void this.detection.start();
  }
}
