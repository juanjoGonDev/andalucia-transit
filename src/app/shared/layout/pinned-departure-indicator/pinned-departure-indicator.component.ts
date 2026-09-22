import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { PinnedDepartureService, PinnedDepartureView } from '@domain/route-search/pinned-departure.service';
import { CountdownDuration } from '@domain/utils/countdown-labels.util';

const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PINNED_KEYS = {
  ariaLabel: 'layout.pinnedDeparture.ariaLabel',
  details: 'layout.pinnedDeparture.details',
  open: 'layout.pinnedDeparture.open',
  unpin: 'layout.pinnedDeparture.unpin'
} as const;

@Component({
  selector: 'app-pinned-departure-indicator',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pinned-departure-indicator.component.html',
  styleUrl: './pinned-departure-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PinnedDepartureIndicatorComponent {
  protected readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly pins = inject(PinnedDepartureService);
  private readonly translate = inject(TranslateService);

  protected readonly pin = this.pins.pin;
  protected readonly expanded = signal(false);
  protected readonly upcomingKey = this.config.translationKeys.routeSearch.upcomingLabel;
  protected readonly pinnedKeys = PINNED_KEYS;

  protected readonly ringOffset = computed(() => {
    const view = this.pin();
    return view ? RING_CIRCUMFERENCE * (1 - view.progress) : RING_CIRCUMFERENCE;
  });

  protected readonly ringGeometry = {
    radius: RING_RADIUS,
    circumference: RING_CIRCUMFERENCE
  };

  protected ariaLabel(view: PinnedDepartureView): string {
    return this.translate.instant(this.pinnedKeys.ariaLabel, {
      lineCode: view.lineCode,
      destination: view.destination,
      time: this.spokenCountdown(view)
    });
  }

  protected spokenCountdown(view: PinnedDepartureView): string {
    const duration: CountdownDuration = view.countdown;
    return this.translate.instant(`countdown.${duration.unit}`, { value: duration.value });
  }

  protected spokenUpcoming(view: PinnedDepartureView): string {
    return this.translate.instant(this.upcomingKey, { time: this.spokenCountdown(view) });
  }

  protected toggle(): void {
    this.expanded.update((open) => !open);
  }

  protected async openSearch(): Promise<void> {
    this.expanded.set(false);
    await this.pins.open();
  }

  protected unpin(): void {
    this.expanded.set(false);
    this.pins.unpin();
  }
}
