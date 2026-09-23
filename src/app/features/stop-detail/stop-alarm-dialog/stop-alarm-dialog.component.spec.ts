import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { NotificationPermissionService } from '@core/services/notification-permission.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopAlarmsStorage } from '@data/stop-alarms/stop-alarms.storage';
import { StopAlarmsService } from '@domain/stop-alarms/stop-alarms.service';
import {
  OVERLAY_DIALOG_DATA,
  OVERLAY_DIALOG_REF
} from '@shared/ui/dialog/overlay-dialog.service';
import {
  StopAlarmDialogComponent,
  StopAlarmDialogData
} from './stop-alarm-dialog.component';

const MINUTES = 60_000;

describe('StopAlarmDialogComponent', () => {
  let fixture: ComponentFixture<StopAlarmDialogComponent>;
  let alarms: StopAlarmsService;
  let permissions: jasmine.SpyObj<NotificationPermissionService>;
  let closeSpy: jasmine.Spy;
  let data: StopAlarmDialogData;

  beforeEach(async () => {
    data = {
      stopId: 'stop-1',
      serviceId: 'service-1',
      consortiumId: 4,
      stopName: 'Calle Principal',
      lineCode: 'M-101',
      destination: 'Centro',
      arrivalTime: new Date(Date.now() + 45 * MINUTES),
      minutesUntilArrival: 45
    };
    closeSpy = jasmine.createSpy('close');

    permissions = jasmine.createSpyObj<NotificationPermissionService>(
      'NotificationPermissionService',
      ['request', 'refresh', 'show']
    );

    await TestBed.configureTestingModule({
      imports: [StopAlarmDialogComponent, TranslateModule.forRoot()],
      providers: [
        StopAlarmsService,
        {
          provide: StopAlarmsStorage,
          useValue: (() => {
            const spy = jasmine.createSpyObj<StopAlarmsStorage>('StopAlarmsStorage', [
              'load',
              'save',
              'clear'
            ]);
            spy.load.and.returnValue([]);
            return spy;
          })()
        },
        { provide: NotificationPermissionService, useValue: permissions },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG },
        { provide: OVERLAY_DIALOG_DATA, useValue: data },
        { provide: OVERLAY_DIALOG_REF, useValue: { close: closeSpy } }
      ]
    }).compileComponents();

    alarms = TestBed.inject(StopAlarmsService);
    fixture = TestBed.createComponent(StopAlarmDialogComponent);
    fixture.detectChanges();
  });

  function buildData(): StopAlarmDialogData {
    return {
      stopId: 'stop-1',
      serviceId: 'service-1',
      consortiumId: 4,
      stopName: 'Calle Principal',
      lineCode: 'M-101',
      destination: 'Centro',
      arrivalTime: new Date(Date.now() + 45 * MINUTES),
      minutesUntilArrival: 45
    };
  }

  /** Rebuilds the dialog fixture with an adjusted service (e.g. an imminent arrival). */
  async function recreate(override: Partial<StopAlarmDialogData>): Promise<void> {
    TestBed.resetTestingModule();
    data = { ...buildData(), ...override };

    await TestBed.configureTestingModule({
      imports: [StopAlarmDialogComponent, TranslateModule.forRoot()],
      providers: [
        StopAlarmsService,
        {
          provide: StopAlarmsStorage,
          useValue: (() => {
            const spy = jasmine.createSpyObj<StopAlarmsStorage>('StopAlarmsStorage', [
              'load',
              'save',
              'clear'
            ]);
            spy.load.and.returnValue([]);
            return spy;
          })()
        },
        { provide: NotificationPermissionService, useValue: permissions },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG },
        { provide: OVERLAY_DIALOG_DATA, useValue: data },
        { provide: OVERLAY_DIALOG_REF, useValue: { close: closeSpy } }
      ]
    }).compileComponents();

    alarms = TestBed.inject(StopAlarmsService);
    fixture = TestBed.createComponent(StopAlarmDialogComponent);
    fixture.detectChanges();
  }

  function chips(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.stop-alarm__chip')
    ) as HTMLButtonElement[];
  }

  it('preselects the default offset and previews the trigger time', () => {
    const active = fixture.nativeElement.querySelector('.stop-alarm__chip--active');
    const preview = fixture.nativeElement.querySelector('.stop-alarm__preview');

    expect(active).not.toBeNull();
    const component = fixture.componentInstance as unknown as { triggerAt(): number };
    expect(Number.isFinite(component.triggerAt())).toBeTrue();
    expect(preview).not.toBeNull();
  });

  it('selects quick offsets from the chips', () => {
    const tenMinutes = chips()[1];

    tenMinutes.click();
    fixture.detectChanges();

    expect(tenMinutes.getAttribute('aria-pressed')).toBe('true');
    expect(alarms.snapshot.length).toBe(0);
  });

  it('creates the alarm after permission is granted', async () => {
    permissions.request.and.resolveTo('granted');

    const save = fixture.nativeElement.querySelector('.app-button--primary');
    (save as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(permissions.request).toHaveBeenCalled();
    expect(alarms.snapshot.length).toBe(1);
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('shows the permission error with a retry action instead of saving', async () => {
    permissions.request.and.resolveTo('denied');

    const save = fixture.nativeElement.querySelector('.app-button--primary');
    (save as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(alarms.snapshot.length).toBe(0);
    expect(closeSpy).not.toHaveBeenCalled();
    const error = fixture.nativeElement.querySelector('.stop-alarm__permission');
    expect(error).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.stop-alarm__permission-action')
    ).not.toBeNull();
  });

  it('flags the repeat switch as a semantic switch', () => {
    const repeat = fixture.nativeElement.querySelector('.stop-alarm__repeat');

    expect(repeat.getAttribute('role')).toBe('switch');
    expect(repeat.getAttribute('aria-checked')).toBe('false');
  });

  it('blocks one-shot saves when the remaining time is shorter than the offset', async () => {
    await recreate({
      arrivalTime: new Date(Date.now() + 3 * MINUTES),
      minutesUntilArrival: 3
    });

    const save = fixture.nativeElement.querySelector('.app-button--primary');
    (save as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as { canSave(): boolean };
    expect(comp.canSave()).toBeFalse();
    expect(alarms.snapshot.length).toBe(0);
    expect(fixture.nativeElement.querySelector('.stop-alarm__warning')).not.toBeNull();
  });

  it('skips the too-late guard when recurrence is on and saves right away', async () => {
    await recreate({
      arrivalTime: new Date(Date.now() + 3 * MINUTES),
      minutesUntilArrival: 3
    });

    const repeat = fixture.nativeElement.querySelector('.stop-alarm__repeat');
    repeat.click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as { canSave(): boolean };
    expect(comp.canSave()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.stop-alarm__warning')).toBeNull();

    permissions.request.and.resolveTo('granted');
    const save = fixture.nativeElement.querySelector('.app-button--primary');
    (save as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(alarms.snapshot.length).toBe(1);
    expect(closeSpy).toHaveBeenCalledWith(true);
  });
});
