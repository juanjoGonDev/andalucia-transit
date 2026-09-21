import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { NotificationPermissionService } from '@core/services/notification-permission.service';
import {
  StopAlarmCandidate,
  StopAlarmsService
} from '@domain/stop-alarms/stop-alarms.service';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { DialogLayoutComponent } from '@shared/ui/dialog/dialog-layout.component';
import {
  injectOverlayDialogData,
  injectOverlayDialogRef
} from '@shared/ui/dialog/overlay-dialog.service';

const MINUTES_PER_HOUR = 60;
const CUSTOM_SELECTION = -1;
const SAVE_GUARD_MS = 1_500;
const MINUTES_MS = 60_000;

/**
 * Picks the initial offset: the configured default when it still rings before
 * the arrival, otherwise the quickest choice that is still valid. The dialog
 * should never open in the blocked state when a valid option exists.
 */
function resolveDefaultChoice(
  quickChoices: readonly number[],
  defaultOffsetMinutes: number,
  arrivalTimeMs: number
): number {
  const isValid = (offset: number): boolean =>
    arrivalTimeMs - offset * MINUTES_MS > Date.now() + SAVE_GUARD_MS;

  if (isValid(defaultOffsetMinutes)) {
    return defaultOffsetMinutes;
  }

  const validChoice = [...quickChoices].sort((a, b) => a - b).find(isValid);

  return validChoice ?? defaultOffsetMinutes;
}

export interface StopAlarmDialogData {
  readonly stopId: string;
  readonly serviceId: string;
  readonly consortiumId: number | null;
  readonly stopName: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly arrivalTime: Date;
  readonly minutesUntilArrival: number;
}

@Component({
  selector: 'app-stop-alarm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AccessibleButtonDirective,
    DialogLayoutComponent
  ],
  templateUrl: './stop-alarm-dialog.component.html',
  styleUrl: './stop-alarm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopAlarmDialogComponent {
  private static nextId = 0;

  protected readonly data: StopAlarmDialogData = injectOverlayDialogData<StopAlarmDialogData>();
  private readonly dialogRef = injectOverlayDialogRef<boolean>();
  private readonly alarms = inject(StopAlarmsService);
  private readonly permissions = inject(NotificationPermissionService);

  protected readonly config = APP_CONFIG;
  protected readonly quickChoices = APP_CONFIG.alarms.quickChoiceMinutes;
  protected readonly fieldId = `stop-alarm-offset-${StopAlarmDialogComponent.nextId++}`;

  protected readonly selectedChoice = signal<number>(
    resolveDefaultChoice(
      APP_CONFIG.alarms.quickChoiceMinutes,
      APP_CONFIG.alarms.defaultOffsetMinutes,
      this.data.arrivalTime.getTime()
    )
  );
  protected readonly customMinutes = signal<number>(APP_CONFIG.alarms.defaultOffsetMinutes);
  protected readonly repeatDaily = signal(false);
  protected readonly permissionError = signal(false);

  @ViewChild('permissionAlert')
  private permissionAlert?: ElementRef<HTMLElement>;

  protected readonly isCustom = computed(() => this.selectedChoice() === CUSTOM_SELECTION);

  /** Effective offset: the numeric input only counts when "custom" is selected. */
  protected readonly offsetMinutes = computed(() => {
    if (!this.isCustom()) {
      return this.selectedChoice();
    }

    const value = Number(this.customMinutes());
    return Number.isFinite(value) ? Math.round(value) : 0;
  });

  protected readonly arrivalTime = this.data.arrivalTime;
  protected readonly triggerAt = computed(() => {
    const trigger = this.arrivalTime.getTime() - this.offsetMinutes() * 60_000;
    return Number.isFinite(trigger) ? trigger : Number.NaN;
  });
  protected readonly canSave = computed(
    () =>
      this.offsetMinutes() >= 1 &&
      this.offsetMinutes() <= this.config.alarms.maxCustomMinutes &&
      this.triggerAt() > Date.now() + SAVE_GUARD_MS
  );

  protected selectChoice(minutes: number): void {
    this.selectedChoice.set(minutes);
  }

  protected selectCustom(): void {
    this.selectedChoice.set(CUSTOM_SELECTION);
  }

  protected toggleRepeat(): void {
    this.repeatDaily.update((value) => !value);
  }

  protected formatOffset(minutes: number): string {
    if (minutes < MINUTES_PER_HOUR) {
      return `${minutes} min`;
    }

    const hours = minutes / MINUTES_PER_HOUR;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
  }

  protected formatTrigger(triggerAt: number): string {
    const date = new Date(triggerAt);
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }

    const permission = await this.permissions.request();

    if (permission !== 'granted') {
      this.permissionError.set(true);
      // The dialog body scrolls: bring the recovery action into view.
      setTimeout(() => {
        this.permissionAlert?.nativeElement.scrollIntoView({ block: 'nearest' });
      });
      return;
    }

    const created = this.alarms.add(this.toCandidate());

    if (!created) {
      this.dialogRef.close(false);
      return;
    }

    this.dialogRef.close(true);
  }

  private toCandidate(): StopAlarmCandidate {
    return {
      stopId: this.data.stopId,
      serviceId: this.data.serviceId,
      consortiumId: this.data.consortiumId,
      stopName: this.data.stopName,
      lineCode: this.data.lineCode,
      destination: this.data.destination,
      scheduledArrival: this.arrivalTime,
      offsetMinutes: this.offsetMinutes(),
      repeatDaily: this.repeatDaily()
    };
  }
}
