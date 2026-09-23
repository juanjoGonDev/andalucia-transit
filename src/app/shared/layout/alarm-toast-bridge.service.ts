import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { AlarmSchedulerService, FiredAlarmEvent } from '@domain/stop-alarms/alarm-scheduler.service';
import { buildStopDetailNavigation } from '@shared/navigation/navigation.util';
import { ToastService } from '@shared/ui/toast/toast.service';

const TOAST_KEYS = {
  title: 'layout.toast.alarmTitle',
  body: 'layout.toast.alarmBody',
  open: 'layout.toast.open'
} as const;

/**
 * Surfaces fired alarms as in-app toasts so users notice the ring while the
 * PWA is open (native notifications already cover the background case).
 */
@Injectable({ providedIn: 'root' })
export class AlarmToastBridgeService {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly scheduler = inject(AlarmSchedulerService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.scheduler.fired$.subscribe((event) => this.present(event));
  }

  private present(event: FiredAlarmEvent): void {
    this.toasts.show({
      icon: 'notifications_active',
      titleKey: TOAST_KEYS.title,
      titleParams: { lineCode: event.alarm.lineCode },
      bodyKey: TOAST_KEYS.body,
      bodyParams: { stopName: event.alarm.stopName, destination: event.alarm.destination },
      action: {
        labelKey: TOAST_KEYS.open,
        run: (): void => {
          if (event.alarm.consortiumId === null) {
            void this.router.navigate([this.config.routes.alarms]);
            return;
          }

          const target = buildStopDetailNavigation(
            event.alarm.consortiumId,
            event.alarm.stopId
          );
          void this.router.navigate(target.commands, { queryParams: target.queryParams });
        }
      }
    });
  }
}
