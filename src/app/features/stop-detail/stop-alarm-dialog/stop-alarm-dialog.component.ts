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

/** Restores an edited offset: the matching chip when available, otherwise custom. */
function resolveInitialChoice(quickChoices: readonly number[], offsetMinutes: number): number {
  return quickChoices.includes(offsetMinutes) ? offsetMinutes : CUSTOM_SELECTION;
}

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
  /** Undefined when editing an existing alarm (the arrival is not "upcoming" anymore). */
  readonly minutesUntilArrival?: number;
  /** Present when editing an existing alarm: prefills offset and recurrence. */
  readonly initial?: {
    readonly offsetMinutes: number;
    readonly repeatWeekdays: readonly number[]
  };
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

  private readonly initial: StopAlarmDialogData['initial'] = this.data.initial;
  protected readonly dialogTitleKey = this.initial
    ? 'stopDetail.alarms.editTitle'
    : 'stopDetail.alarms.dialogTitle';

  protected readonly selectedChoice = signal<number>(
    this.initial
      ? resolveInitialChoice(APP_CONFIG.alarms.quickChoiceMinutes, this.initial.offsetMinutes)
      : resolveDefaultChoice(
          APP_CONFIG.alarms.quickChoiceMinutes,
          APP_CONFIG.alarms.defaultOffsetMinutes,
          this.data.arrivalTime.getTime()
        )
  );
  protected readonly customMinutes = signal<number>(
    this.initial?.offsetMinutes ?? APP_CONFIG.alarms.defaultOffsetMinutes
  );
  protected readonly recurring = signal(
    this.initial ? this.initial.repeatWeekdays.length > 0 : false
  );
  protected readonly selectedWeekdays = signal<number[]>(
    this.initial ? [...this.initial.repeatWeekdays] : [this.data.arrivalTime.getDay()]
  );
  /** Display order: Monday first, Sunday last (ES locale convention). */
  protected readonly weekdays: readonly number[] = [1, 2, 3, 4, 5, 6, 0];
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
  protected readonly canSave = computed(() => {
    if (this.offsetMinutes() < 1 || this.offsetMinutes() > this.config.alarms.maxCustomMinutes) {
      return false;
    }

    if (this.recurring()) {
      return this.selectedWeekdays().length > 0;
    }

    return this.triggerAt() > Date.now() + SAVE_GUARD_MS;
  });

  protected selectChoice(minutes: number): void {
    this.selectedChoice.set(minutes);
  }

  protected selectCustom(): void {
    this.selectedChoice.set(CUSTOM_SELECTION);
  }

  protected toggleRepeat(): void {
    this.recurring.update((value) => !value);

    if (this.recurring() && this.selectedWeekdays().length === 0) {
      this.selectedWeekdays.set([this.data.arrivalTime.getDay()]);
    }
  }

  protected isWeekdaySelected(day: number): boolean {
    return this.selectedWeekdays().includes(day);
  }

  protected toggleWeekday(day: number): void {
    if (!this.recurring()) {
      return;
    }

    const updated = this.isWeekdaySelected(day)
      ? this.selectedWeekdays().filter((candidate) => candidate !== day)
      : [...this.selectedWeekdays(), day];

    this.selectedWeekdays.set([...updated].sort((a, b) => a - b));
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

    const saved = this.initial
      ? this.alarms.update(this.alarms.serviceAlarmId(this.data.stopId, this.data.serviceId), {
          offsetMinutes: this.offsetMinutes(),
          repeatWeekdays: this.recurring() ? this.selectedWeekdays() : []
        })
      : this.alarms.add(this.toCandidate()) !== null;

    if (!saved) {
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
      repeatWeekdays: this.recurring() ? this.selectedWeekdays() : []
    };
  }
}
