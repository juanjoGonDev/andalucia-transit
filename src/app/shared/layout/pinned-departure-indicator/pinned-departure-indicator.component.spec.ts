import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { of } from 'rxjs';
import { PinnedDepartureService, PinnedDepartureView } from '@domain/route-search/pinned-departure.service';
import { PinnedDepartureIndicatorComponent } from './pinned-departure-indicator.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'routeSearch.upcomingLabel': 'En {time}',
      'countdown.minute': '{value, plural, one {# minuto} other {# minutos}}',
      'layout.pinnedDeparture.ariaLabel':
        'Salida fijada: línea {lineCode} hacia {destination}. Sale en {time}.',
      'layout.pinnedDeparture.open': 'Abrir búsqueda',
      'layout.pinnedDeparture.unpin': 'Quitar fijación'
    });
  }
}

class PinnedDepartureServiceStub {
  readonly pin: WritableSignal<PinnedDepartureView | null> = signal(null);
  unpinSpy = jasmine.createSpy('unpin');
  openSpy = jasmine.createSpy('open').and.resolveTo(undefined);

  unpin(): void {
    this.unpinSpy();
  }

  async open(): Promise<void> {
    return this.openSpy();
  }
}

function buildView(progress: number): PinnedDepartureView {
  return {
    departureId: 'service-1',
    consortiumId: 3,
    lineId: 'line-1',
    lineCode: '040',
    direction: 1,
    destination: 'Almería',
    originName: 'La Gangosa',
    destinationName: 'Almería',
    arrivalTime: new Date('2026-09-21T14:26:00.000Z'),
    remainingMs: 20 * 60_000,
    progress,
    countdown: { text: '20m', unit: 'minute', value: 20 }
  };
}

describe('PinnedDepartureIndicatorComponent', () => {
  let fixture: ComponentFixture<PinnedDepartureIndicatorComponent>;
  let pins: PinnedDepartureServiceStub;

  async function create(): Promise<void> {
    pins = new PinnedDepartureServiceStub();
    await TestBed.configureTestingModule({
      imports: [
        PinnedDepartureIndicatorComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [{ provide: PinnedDepartureService, useValue: pins }]
    }).compileComponents();

    TestBed.inject(TranslateService).use('es');
    fixture = TestBed.createComponent(PinnedDepartureIndicatorComponent);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders nothing when no departure is pinned', async () => {
    await create();

    expect(fixture.debugElement.query(By.css('.pinned-departure'))).toBeNull();
  });

  it('shows the bus trigger surrounded by a countdown ring with an accessible label', async () => {
    await create();
    pins.pin.set(buildView(0.5));
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('.pinned-departure__trigger'));
    expect(trigger.nativeElement.getAttribute('aria-label')).toBe(
      'Salida fijada: línea 040 hacia Almería. Sale en 20 minutos.'
    );

    const progress = fixture.debugElement.query(By.css('.pinned-departure__ring-progress'));
    const circumference = parseFloat(progress.nativeElement.getAttribute('stroke-dasharray'));
    const offset = parseFloat(progress.nativeElement.getAttribute('stroke-dashoffset'));
    expect(offset).toBeCloseTo(circumference / 2, 1);
  });

  it('fills the ring completely as the departure arrives', async () => {
    await create();
    pins.pin.set(buildView(1));
    fixture.detectChanges();

    const progress = fixture.debugElement.query(By.css('.pinned-departure__ring-progress'));
    expect(parseFloat(progress.nativeElement.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 3);
  });

  it('expands the panel to the left with the remaining time and actions', async () => {
    await create();
    pins.pin.set(buildView(0.25));
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('.pinned-departure__trigger'))
      .nativeElement.click();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('.pinned-departure__panel'));
    expect(panel).not.toBeNull();
    const eta = panel.nativeElement.querySelector('.pinned-departure__eta');
    expect(eta.textContent).toContain('En 20m');
    expect(eta.textContent).toContain('En 20 minutos');

    const actions = panel.nativeElement.querySelectorAll('.pinned-departure__action');
    const openButton = actions[0] as HTMLButtonElement;
    openButton.click();
    expect(pins.openSpy).toHaveBeenCalled();

    const unpinButton = actions[1] as HTMLButtonElement;
    unpinButton.click();
    expect(pins.unpinSpy).toHaveBeenCalled();
  });
});
