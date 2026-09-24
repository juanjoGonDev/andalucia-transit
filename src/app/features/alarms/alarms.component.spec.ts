import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import {
  TranslateCompiler,
  TranslateLoader,
  TranslateModule,
  TranslateService
} from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { Observable, firstValueFrom, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopAlarmsStorage } from '@data/stop-alarms/stop-alarms.storage';
import { StopAlarm } from '@domain/stop-alarms/stop-alarm.model';
import { StopAlarmsService } from '@domain/stop-alarms/stop-alarms.service';
import { AlarmsComponent } from '@features/alarms/alarms.component';
import {
  StopAlarmDialogComponent,
  StopAlarmDialogData
} from '@features/stop-detail/stop-alarm-dialog/stop-alarm-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/ui/confirm-dialog/confirm-dialog.component';
import {
  OverlayDialogRef,
  OverlayDialogService
} from '@shared/ui/dialog/overlay-dialog.service';

const MINUTES = 60_000;

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      alarms: {
        title: 'Alarmas de llegada',
        description: 'Todos los avisos programados.',
        summary: {
          active: '{count, plural, =0 {Sin alarmas activas} one {# alarma activa} other {# alarmas activas}}',
          disabled: '{count, plural, =0 {ninguna desactivada} one {# desactivada} other {# desactivadas}}'
        },
        empty: 'Aún no tienes alarmas',
        emptyHint: 'Programa un aviso desde una parada o una búsqueda.',
        emptyCta: 'Buscar horarios',
        ringsAt: 'Suena {minutes} min antes de las {time}',
        arrivalAt: 'llega {time}',
        expired: 'Caducada',
        repeatBadge: 'Cada día',
        disabledBadge: 'Desactivada',
        list: { stopLabel: 'Parada', lineLabel: 'Línea' },
        actions: {
          enable: 'Activar',
          disable: 'Desactivar',
          enableA11y: 'Activar alarma de la línea {line}',
          disableA11y: 'Desactivar alarma de la línea {line}',
          remove: 'Eliminar alarma de la línea {line}',
          removeAll: 'Eliminar todas las alarmas'
        },
        dialogs: {
          remove: {
            title: '¿Eliminar esta alarma?',
            message: 'Dejarás de recibir el aviso.',
            confirm: 'Sí, eliminar',
            cancel: 'Cancelar'
          },
          removeAll: {
            title: '¿Eliminar todas las alarmas?',
            message: 'Se borrarán todas las alarmas programadas.',
            confirm: 'Eliminar todas',
            cancel: 'Cancelar'
          },
          details: { stop: 'Parada', line: 'Línea', time: 'Hora' }
        }
      }
    });
  }
}

class OverlayDialogServiceStub {
  private response$: Observable<boolean | undefined> = of(true);
  private lastComponentRef: unknown;
  private lastConfig: { data?: unknown; role?: 'dialog' | 'alertdialog' } | undefined;

  readonly open = jasmine.createSpy('open').and.callFake(
    (component: unknown, config?: { data?: unknown; role?: 'dialog' | 'alertdialog' }) => {
      this.lastComponentRef = component;
      this.lastConfig = config;
      const ref: OverlayDialogRef<boolean> = {
        afterClosed: () => this.response$,
        close: () => undefined
      };
      return ref;
    }
  );

  setResponse(value: boolean): void {
    this.response$ = of(value);
  }

  lastComponent(): unknown {
    return this.lastComponentRef;
  }

  lastData(): unknown {
    return this.lastConfig?.data;
  }

  lastConfirmData(): ConfirmDialogData | undefined {
    return this.lastConfig?.data as ConfirmDialogData | undefined;
  }
}

const languageService = {
  currentLanguage: signal<'es' | 'en'>('es').asReadonly()
};

function persistentAlarm(overrides: Partial<StopAlarm> = {}): StopAlarm {
  return {
    id: 'stop-1::service-1',
    stopId: 'stop-1',
    consortiumId: 4,
    stopName: 'Calle Principal',
    lineCode: 'M-101',
    destination: 'Centro',
    scheduledArrival: new Date(Date.now() + 60 * MINUTES).toISOString(),
    offsetMinutes: 10,
    repeatWeekdays: [],
    enabled: true,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe('AlarmsComponent', () => {
  it('lists every stored alarm with its ring time, badges and summary counts', () => {
    hydrate([
      persistentAlarm(),
      persistentAlarm({
        id: 'stop-1::service-repeat',
        lineCode: 'M-202',
        repeatWeekdays: [1, 2, 3],
        enabled: false,
        scheduledArrival: new Date(Date.now() - 48 * 60 * MINUTES).toISOString()
      }),
      persistentAlarm({
        id: 'stop-1::service-expired',
        lineCode: 'M-303',
        enabled: false,
        scheduledArrival: new Date(Date.now() - 48 * 60 * MINUTES).toISOString()
      })
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.alarms__item');
    expect(items.length).toBe(3);

    const activeSummary = fixture.nativeElement.querySelector('.alarms__summary-active');
    const disabledSummary = fixture.nativeElement.querySelector('.alarms__summary-disabled');
    expect(activeSummary?.textContent?.trim()).toContain('1 alarma activa');
    expect(disabledSummary?.textContent?.trim()).toContain('2 desactivadas');

    const repeatBadge = fixture.nativeElement.querySelector('.alarms__item-badge--repeat');
    const expiredBadge = fixture.nativeElement.querySelector('.alarms__item-badge--expired');
    const offBadge = fixture.nativeElement.querySelector('.alarms__item-badge--off');
    expect(repeatBadge).not.toBeNull();
    expect(expiredBadge).not.toBeNull();
    expect(offBadge).not.toBeNull();

    const ringTime = items[0].querySelector('.alarms__item-ring');
    expect(ringTime?.textContent?.trim()).toMatch(/^\d{2}:\d{2}$/);
  });


  let fixture: ComponentFixture<AlarmsComponent>;
  let storage: jasmine.SpyObj<StopAlarmsStorage>;
  let dialog: OverlayDialogServiceStub;

  beforeEach(async () => {
    storage = jasmine.createSpyObj<StopAlarmsStorage>('StopAlarmsStorage', [
      'load',
      'save',
      'clear'
    ]);
    storage.load.and.returnValue([]);
    dialog = new OverlayDialogServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AlarmsComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: StopAlarmsStorage, useValue: storage },
        { provide: OverlayDialogService, useValue: dialog },
        { provide: LanguageService, useValue: languageService },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('es'));

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  /** The service hydrates on first injection, so persisted rows must be set first. */
  function hydrate(persisted: readonly StopAlarm[]): StopAlarmsService {
    storage.load.and.returnValue(persisted);
    const service = TestBed.inject(StopAlarmsService);
    fixture = TestBed.createComponent(AlarmsComponent);
    return service;
  }

  function createComponent(): void {
    TestBed.inject(StopAlarmsService);
    fixture = TestBed.createComponent(AlarmsComponent);
  }

  it('renders the empty state with the search CTA when there are no alarms', () => {
    createComponent();
    fixture.detectChanges();

    const emptyMessage = fixture.nativeElement.querySelector('.alarms__empty-message');
    const emptyCta = fixture.nativeElement.querySelector('.alarms__empty-cta');
    const items = fixture.nativeElement.querySelectorAll('.alarms__item');

    expect(emptyMessage?.textContent).toContain('Aún no tienes alarmas');
    expect(emptyCta).not.toBeNull();
    expect(items.length).toBe(0);
  });

  it('toggles the enabled flag through the service when the switch is used', () => {
    const service = hydrate([persistentAlarm()]);
    fixture.detectChanges();

    const switchButton = fixture.nativeElement.querySelector(
      '.alarms__item-switch'
    ) as HTMLButtonElement;
    expect(switchButton.getAttribute('aria-pressed')).toBe('true');

    switchButton.click();
    fixture.detectChanges();

    expect(service.snapshot[0].enabled).toBeFalse();
    expect(
      (fixture.nativeElement.querySelector('.alarms__item-switch') as HTMLButtonElement).getAttribute(
        'aria-pressed'
      )
    ).toBe('false');
  });

  it('removes one alarm after the confirm dialog is accepted', () => {
    const service = hydrate([persistentAlarm()]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.alarms__item-remove') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dialog.lastComponent()).toBe(ConfirmDialogComponent);
    const dialogData = dialog.lastConfirmData();
    expect(dialogData?.titleKey).toBe('alarms.dialogs.remove.title');
    expect(dialogData?.details?.length).toBe(3);

    const removed = service.snapshot.length;
    expect(removed).toBe(0);
  });

  it('keeps the alarm when the remove dialog is dismissed', () => {
    const service = hydrate([persistentAlarm()]);
    dialog.setResponse(false);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.alarms__item-remove') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.snapshot.length).toBe(1);
  });

  it('opens the alarm dialog prefilled with the current values when editing', () => {
    hydrate([
      persistentAlarm({ offsetMinutes: 20, repeatWeekdays: [1, 3] })
    ]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.alarms__item-edit') as HTMLButtonElement).click();

    expect(dialog.lastComponent()).toBe(StopAlarmDialogComponent);
    const data = dialog.lastData() as StopAlarmDialogData;
    expect(data.stopId).toBe('stop-1');
    expect(data.serviceId).toBe('service-1');
    expect(data.consortiumId).toBe(4);
    expect(data.lineCode).toBe('M-101');
    expect(data.minutesUntilArrival).toBeUndefined();
    expect(data.arrivalTime).toBeInstanceOf(Date);
    expect(data.initial).toEqual({ offsetMinutes: 20, repeatWeekdays: [1, 3] });
  });

  it('hides the edit action for expired alarms but keeps the remove action', () => {
    hydrate([
      persistentAlarm({
        enabled: false,
        scheduledArrival: new Date(Date.now() - 48 * 60 * MINUTES).toISOString()
      })
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.alarms__item-edit')).toBeNull();
    expect(fixture.nativeElement.querySelector('.alarms__item-remove')).not.toBeNull();
  });

  it('removes every alarm after the remove-all dialog is accepted', () => {
    const service = hydrate([persistentAlarm(), persistentAlarm({ id: 'stop-1::service-2' })]);
    fixture.detectChanges();

    const removeAll = fixture.nativeElement.querySelector(
      '.alarms__remove-all'
    ) as HTMLElement;
    removeAll.click();
    fixture.detectChanges();

    expect(dialog.lastConfirmData()?.titleKey).toBe('alarms.dialogs.removeAll.title');
    expect(service.snapshot.length).toBe(0);
  });

  it('keeps the remove-all action disabled while the list is empty', () => {
    createComponent();
    fixture.detectChanges();

    const removeAll = fixture.nativeElement.querySelector('.alarms__remove-all');
    expect(removeAll?.classList.contains('is-disabled')).toBeTrue();
  });

  it('navigates to the search when the empty-state CTA is activated', () => {
    createComponent();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    (fixture.nativeElement.querySelector('.alarms__empty-cta') as HTMLElement).click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalled();
  });
});
