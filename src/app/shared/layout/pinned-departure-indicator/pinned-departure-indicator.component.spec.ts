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
      'layout.pinnedDeparture.open': 'Abrir la búsqueda de {lineCode} hacia {destination}',
      'layout.pinnedDeparture.unpin': 'Quitar la salida fijada'
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

  it('expands the panel to the left with a compact countdown and no En prefix', async () => {
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
    expect(eta.textContent).not.toContain('En 20m');
    expect(eta.textContent).toContain('20m');
    expect(eta.textContent).toContain('20 minutos');

    const clock = panel.nativeElement.querySelector('.pinned-departure__eta-icon');
    expect(clock).not.toBeNull();
    expect(clock.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens the search from the bubble itself with no external-link action', async () => {
    await create();
    pins.pin.set(buildView(0.25));
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('.pinned-departure__trigger'))
      .nativeElement.click();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('.pinned-departure__panel'));
    expect(panel.nativeElement.querySelector('.pinned-departure__action--open')).toBeNull();
    expect(panel.nativeElement.textContent).not.toContain('open_in_new');

    const bubble = panel.nativeElement.querySelector('.pinned-departure__bubble') as HTMLButtonElement;
    expect(bubble).not.toBeNull();
    bubble.click();
    expect(pins.openSpy).toHaveBeenCalled();
  });

  it('stacks the countdown below the line name inside an airier bubble', async () => {
    await create();
    pins.pin.set(buildView(0.25));
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('.pinned-departure__trigger'))
      .nativeElement.click();
    fixture.detectChanges();

    const bubble = fixture.debugElement.query(By.css('.pinned-departure__bubble'))
      .nativeElement as HTMLElement;
    const order = Array.from(bubble.children).map((node) => (node as HTMLElement).className);
    const lineIndex = order.findIndex((name) => name.includes('pinned-departure__line'));
    const infoIndex = order.findIndex((name) => name.includes('pinned-departure__info'));
    expect(lineIndex).toBeGreaterThanOrEqual(0);
    expect(infoIndex).toBeGreaterThan(lineIndex);
  });

  it('shows only the destination nucleus while labels keep the full destination', async () => {
    await create();
    pins.pin.set({ ...buildView(0.25), destination: 'Aguadulce - La Gloria' });
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('.pinned-departure__trigger'))
      .nativeElement.click();
    fixture.detectChanges();

    const destination = fixture.debugElement.query(By.css('.pinned-departure__destination'));
    expect(destination.nativeElement.textContent.trim()).toBe('Aguadulce');
    expect(destination.nativeElement.textContent).not.toContain('La Gloria');

    const bubble = fixture.debugElement.query(By.css('.pinned-departure__bubble'));
    expect(bubble.nativeElement.getAttribute('aria-label')).toContain('Aguadulce - La Gloria');
  });

  it('dismisses the pin from a trash action', async () => {
    await create();
    pins.pin.set(buildView(0.25));
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('.pinned-departure__trigger'))
      .nativeElement.click();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('.pinned-departure__panel'));
    expect(panel.nativeElement.textContent).not.toContain('close');

    const trash = panel.nativeElement.querySelector('.pinned-departure__action--dismiss') as HTMLButtonElement;
    expect(trash).not.toBeNull();
    expect(trash.textContent).toContain('delete');
    expect(trash.getAttribute('aria-label')).not.toBeNull();
    trash.click();
    expect(pins.unpinSpy).toHaveBeenCalled();
  });
});
