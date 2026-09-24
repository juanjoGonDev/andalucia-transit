import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { AppConfig } from '@core/config';
import { NotificationPermissionService } from '@core/services/notification-permission.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import {
  StopAlarmRuntime,
  advanceRepeatTrigger,
  isRecurringAlarm,
  minutesUntilTrigger
} from '@domain/stop-alarms/stop-alarm.model';
import { StopAlarmsService } from '@domain/stop-alarms/stop-alarms.service';

export interface FiredAlarmEvent {
  readonly alarm: StopAlarmRuntime;
  readonly nextTriggerAt: number | null;
}

/** Grace window: triggers missed while the device slept by more than this expire silently. */
const MISSED_TRIGGER_GRACE_MS = 2 * 60_000;

/**
 * Fires due alarms as PWA notifications and manages the repeat lifecycle:
 * a repeating alarm re-arms for the next day unless the user deactivates it.
 *
 * `initialize()` is called once from the AppComponent so alarms ring from any
 * page while the PWA is open. When the app is fully closed, browsers provide no
 * reliable web-only scheduling, so the alarm re-arms on the next launch through
 * `StopAlarmsService.refreshRuntime()`.
 */
@Injectable({ providedIn: 'root' })
export class AlarmSchedulerService {
  private readonly alarms = inject(StopAlarmsService);
  private readonly permissions = inject(NotificationPermissionService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly firedSubject = new Subject<FiredAlarmEvent>();
  private readonly latestFiredSubject = new BehaviorSubject<FiredAlarmEvent | null>(null);
  /** Emits whenever an alarm rings while the app is open (used for the in-app banner). */
  readonly fired$ = this.firedSubject.asObservable();
  /** Latest fired alarm, replayed so pages opened afterwards can surface the banner. */
  readonly latestFired$ = this.latestFiredSubject.asObservable();

  private readonly destroyRef = inject(DestroyRef);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.alarms.refreshRuntime();
    // Ring triggers that elapsed while the PWA was closed (within the grace window).
    this.processDueAlarms();

    interval(this.config.alarms.pollIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.processDueAlarms());
  }

  processDueAlarms(now: number = Date.now()): void {
    for (const alarm of this.alarms.snapshot) {
      if (!alarm.enabled || alarm.nextTriggerAt === null || alarm.nextTriggerAt > now) {
        continue;
      }

      const missed = now - alarm.nextTriggerAt;
      const shouldNotify = missed <= MISSED_TRIGGER_GRACE_MS;

      if (shouldNotify) {
        this.notify(alarm, now);
      }

      const nextTriggerAt = isRecurringAlarm(alarm)
        ? advanceRepeatTrigger(alarm, alarm.nextTriggerAt, {
            now,
            maxRepeatDays: this.config.alarms.maxRepeatDays
          })
        : null;

      this.alarms.rescheduleAfterFiring(alarm, nextTriggerAt);
      const event: FiredAlarmEvent = { alarm, nextTriggerAt };
      this.firedSubject.next(event);
      this.latestFiredSubject.next(event);
    }
  }

  private notify(alarm: StopAlarmRuntime, now: number): void {
    const triggerAt = alarm.nextTriggerAt as number;
    const minutes = minutesUntilTrigger(triggerAt, now);
    const title = this.translate.instant(this.config.translationKeys.stopDetail.alarms.notificationTitle, {
      lineCode: alarm.lineCode
    });
    const body = this.translate.instant(this.config.translationKeys.stopDetail.alarms.notificationBody, {
      time: formatTime(new Date(triggerAt + alarm.offsetMinutes * 60_000)),
      stopName: alarm.stopName,
      destination: alarm.destination,
      minutes
    });

    this.permissions.show(title, {
      body,
      tag: alarm.id,
      icon: 'favicon.svg',
      onClick: () => {
        void this.router.navigate([this.config.routes.stopDetailBase, alarm.stopId], {
          queryParams:
            alarm.consortiumId === null
              ? undefined
              : { [this.config.routeParams.stopInfo.consortiumId]: alarm.consortiumId }
        });
      }
    });
  }
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
