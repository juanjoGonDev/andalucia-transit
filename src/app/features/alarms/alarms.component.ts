import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, map, shareReplay, startWith } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import {
  StopAlarmRuntime,
  computeTriggerAt,
  splitStopAlarmId
} from '@domain/stop-alarms/stop-alarm.model';
import { StopAlarmsService } from '@domain/stop-alarms/stop-alarms.service';
import {
  StopAlarmDialogComponent,
  StopAlarmDialogData
} from '@features/stop-detail/stop-alarm-dialog/stop-alarm-dialog.component';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/ui/confirm-dialog/confirm-dialog.component';
import { OverlayDialogService } from '@shared/ui/dialog/overlay-dialog.service';

export interface AlarmsListItem {
  readonly id: string;
  readonly stopName: string;
  readonly lineCode: string;
  readonly destination: string;
  /** HH:mm of the scheduled arrival the alarm targets. */
  readonly arrivalTime: string;
  /** HH:mm of the next ring, or null when the alarm is disabled and unreachable. */
  readonly ringTime: string | null;
  readonly offsetMinutes: number;
  readonly repeatWeekdays: readonly number[];
  readonly enabled: boolean;
  /** Disabled alarms whose target already elapsed: kept listed but unrecoverable. */
  readonly isExpired: boolean;
  readonly consortiumId: number | null;
  /** ISO timestamp of the scheduled arrival the alarm targets. */
  readonly scheduledArrival: string;
}

@Component({
  selector: 'app-alarms',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AccessibleButtonDirective,
    AppLayoutContentDirective
  ],
  templateUrl: './alarms.component.html',
  styleUrl: './alarms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmsComponent {
  protected readonly translationKeys = APP_CONFIG.translationKeys.alarms;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.alarms;
  protected readonly alarmIcon = 'alarm' as const;
  protected readonly repeatIcon = 'notifications_active' as const;

  private readonly alarmsService = inject(StopAlarmsService);
  private readonly overlayDialogs = inject(OverlayDialogService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  /** Recomputed on alarms and language changes so translated labels stay fresh. */
  protected readonly items$ = combineLatest([
    this.alarmsService.alarms$,
    this.translate.onLangChange.pipe(startWith(null))
  ]).pipe(
    map(([alarms]) => alarms.map((alarm) => AlarmsComponent.toListItem(alarm))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly hasAlarms$ = this.items$.pipe(map((items) => items.length > 0));

  protected trackByAlarmId = (_: number, alarm: AlarmsListItem): string => alarm.id;

  protected countActive(items: readonly AlarmsListItem[]): number {
    return items.filter((alarm) => alarm.enabled).length;
  }

  protected countDisabled(items: readonly AlarmsListItem[]): number {
    return items.length - this.countActive(items);
  }

  protected toggleEnabled(alarm: AlarmsListItem): void {
    this.alarmsService.setEnabled(alarm.id, !alarm.enabled);
  }

  protected editAlarm(alarm: AlarmsListItem): void {
    const parts = splitStopAlarmId(alarm.id);

    if (!parts) {
      return;
    }

    const arrivalTime = new Date(alarm.scheduledArrival);

    if (Number.isNaN(arrivalTime.getTime())) {
      return;
    }

    const data: StopAlarmDialogData = {
      stopId: parts.stopId,
      serviceId: parts.serviceId,
      consortiumId: alarm.consortiumId,
      stopName: alarm.stopName,
      lineCode: alarm.lineCode,
      destination: alarm.destination,
      arrivalTime,
      initial: {
        offsetMinutes: alarm.offsetMinutes,
        repeatWeekdays: alarm.repeatWeekdays
      }
    };

    this.overlayDialogs.open<StopAlarmDialogComponent, StopAlarmDialogData, boolean>(
      StopAlarmDialogComponent,
      { data, role: 'dialog' }
    );
  }

  protected confirmRemove(alarm: AlarmsListItem): void {
    const dialogRef = this.overlayDialogs.open<
      ConfirmDialogComponent,
      ConfirmDialogData,
      boolean
    >(ConfirmDialogComponent, {
      data: {
        titleKey: this.translationKeys.dialogs.remove.title,
        messageKey: this.translationKeys.dialogs.remove.message,
        confirmKey: this.translationKeys.dialogs.remove.confirm,
        cancelKey: this.translationKeys.dialogs.remove.cancel,
        details: [
          { labelKey: this.translationKeys.dialogs.details.line, value: alarm.lineCode },
          { labelKey: this.translationKeys.dialogs.details.stop, value: alarm.stopName },
          {
            labelKey: this.translationKeys.dialogs.details.time,
            value: alarm.ringTime ?? alarm.arrivalTime
          }
        ]
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.alarmsService.remove(alarm.id);
      }
    });
  }

  protected confirmRemoveAll(): void {
    const dialogRef = this.overlayDialogs.open<
      ConfirmDialogComponent,
      ConfirmDialogData,
      boolean
    >(ConfirmDialogComponent, {
      data: {
        titleKey: this.translationKeys.dialogs.removeAll.title,
        messageKey: this.translationKeys.dialogs.removeAll.message,
        confirmKey: this.translationKeys.dialogs.removeAll.confirm,
        cancelKey: this.translationKeys.dialogs.removeAll.cancel
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.alarmsService.removeAll();
      }
    });
  }

  protected goToSearch(): void {
    void this.router.navigate([APP_CONFIG.routes.home]);
  }

  private static toListItem(alarm: StopAlarmRuntime): AlarmsListItem {
    const arrivalMs = computeTriggerAt(alarm.scheduledArrival, 0);

    return {
      id: alarm.id,
      stopName: alarm.stopName,
      lineCode: alarm.lineCode,
      destination: alarm.destination,
      arrivalTime: formatTime(new Date(arrivalMs ?? Date.parse(alarm.scheduledArrival))),
      ringTime: alarm.nextTriggerAt === null ? null : formatTime(new Date(alarm.nextTriggerAt)),
      offsetMinutes: alarm.offsetMinutes,
      repeatWeekdays: alarm.repeatWeekdays,
      enabled: alarm.enabled,
      isExpired: !alarm.enabled && alarm.nextTriggerAt === null,
      consortiumId: alarm.consortiumId,
      scheduledArrival: alarm.scheduledArrival
    };
  }
}

function formatTime(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}
