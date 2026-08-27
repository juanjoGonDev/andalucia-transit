import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import {
  StopInfoFacade,
  StopInformationDetail,
  StopInformationState,
} from '@domain/stops/stop-info.facade';
import { StopInfoComponent } from '@features/stop-info/stop-info.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

const STATUS_ROLE = 'status';
const POLITE_LIVE_REGION = 'polite';
const ASSERTIVE_LIVE_REGION = 'assertive';

class StopInfoFacadeStub {
  private readonly subject = new BehaviorSubject<StopInformationState>({ status: 'idle' });
  readonly state$ = this.subject.asObservable();
  readonly selectStop = jasmine.createSpy('selectStop');
  readonly refresh = jasmine.createSpy('refresh');

  emit(state: StopInformationState): void {
    this.subject.next(state);
  }
}

class GeolocationServiceStub {
  callCount = 0;
  private position = buildPosition(37.786, -3.775);
  private error: unknown = null;

  setPosition(latitude: number, longitude: number): void {
    this.position = buildPosition(latitude, longitude);
    this.error = null;
  }

  failWith(error: unknown): void {
    this.error = error;
  }

  async getCurrentPosition(): Promise<GeolocationPosition> {
    this.callCount += 1;

    if (this.error) {
      throw this.error;
    }

    return this.position;
  }
}

describe('StopInfoComponent', () => {
  let fixture: ComponentFixture<StopInfoComponent>;
  let facade: StopInfoFacadeStub;
  let geolocation: GeolocationServiceStub;
  let router: Router;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const detail: StopInformationDetail = {
    consortiumId: 7,
    stopNumber: '56',
    stopCode: '056',
    name: 'Campus Universitario-I',
    description: 'Bus stop next to the university entrance.',
    observations: 'Platform shared with lines M02 and M04.',
    correspondences: ['M02-06', 'M02-07'],
    municipality: 'Jaén',
    nucleus: 'Jaén',
    zone: 'A',
    location: { latitude: 37.78574, longitude: -3.77469 },
    isMain: true,
    isInactive: false,
  };

  beforeEach(async () => {
    facade = new StopInfoFacadeStub();
    geolocation = new GeolocationServiceStub();
    paramMapSubject = new BehaviorSubject(
      convertToParamMap({ consortiumId: '7', stopNumber: '56' }),
    );
    const routerStub = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerStub.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [
        StopInfoComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
      providers: [
        { provide: StopInfoFacade, useValue: facade },
        { provide: GeolocationService, useValue: geolocation },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject.asObservable() } },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('selects the stop defined in the route parameters', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    expect(facade.selectStop).toHaveBeenCalledWith(7, '56');
  }));

  it('renders the stop details when the state is ready', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'ready', detail, source: 'live' });
    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector(
      '.stop-info__card-title',
    ) as HTMLElement | null;
    const tagElements = fixture.nativeElement.querySelectorAll('.stop-info__tag');

    expect(titleElement?.textContent?.trim()).toBe('Campus Universitario-I');
    expect(tagElements.length).toBe(1);
  }));

  it('keeps technical identifiers and raw coordinates out of the primary details', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'ready', detail, source: 'live' });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.stop-info__card') as HTMLElement | null;
    const text = card?.textContent ?? '';
    const location = detail.location;

    if (!location) {
      throw new Error('Test stop detail must include a location.');
    }

    expect(card).not.toBeNull();
    expect(text).not.toContain(detail.stopNumber);
    expect(text).not.toContain(detail.stopCode);
    expect(text).not.toContain(String(location.latitude));
    expect(text).not.toContain(String(location.longitude));
    expect(card?.querySelector('.stop-info__location')).not.toBeNull();
    expect(card?.querySelector('.stop-info__zone')).not.toBeNull();
    expect(card?.querySelector('.stop-info__correspondence-list')).not.toBeNull();
  }));

  it('calculates an explicit approximate distance without presenting it as a walking route', fakeAsync(() => {
    geolocation.setPosition(37.786, -3.775);
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'ready', detail, source: 'live' });
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector(
      '.stop-info__directions-action',
    ) as HTMLButtonElement | null;

    if (!action) {
      throw new Error('Directions action not found');
    }

    action.click();
    flushMicrotasks();
    fixture.detectChanges();

    expect(geolocation.callCount).toBe(1);
    expect(fixture.nativeElement.querySelector('.stop-info__directions-distance')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.stop-info__directions-disclaimer')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.leaflet-routing-container')).toBeNull();
  }));

  it('surfaces a recoverable geolocation error in the directions section', fakeAsync(() => {
    geolocation.failWith(permissionDeniedError());
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'ready', detail, source: 'live' });
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector(
      '.stop-info__directions-action',
    ) as HTMLButtonElement | null;

    if (!action) {
      throw new Error('Directions action not found');
    }

    action.click();
    flushMicrotasks();
    fixture.detectChanges();

    expect(geolocation.callCount).toBe(1);
    expect(fixture.nativeElement.querySelector('.stop-info__directions-error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.stop-info__directions-action')).not.toBeNull();
  }));

  it('does not request geolocation when stop coordinates are unavailable', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({
      status: 'ready',
      detail: { ...detail, location: null },
      source: 'live',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stop-info__directions-unavailable')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.stop-info__directions-action')).toBeNull();
    expect(geolocation.callCount).toBe(0);
  }));

  it('shows the offline notice when using cached data', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'ready', detail, source: 'offline' });
    fixture.detectChanges();

    const noticeElement = fixture.nativeElement.querySelector('.stop-info__notice-text');
    expect(noticeElement).not.toBeNull();
  }));

  it('redirects to home when the route parameters are invalid', fakeAsync(() => {
    const navigateSpy = router.navigate as jasmine.Spy;
    navigateSpy.calls.reset();

    paramMapSubject.next(convertToParamMap({}));

    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/', '']);
    expect(facade.selectStop).not.toHaveBeenCalled();
  }));

  it('triggers a refresh when the action button is activated', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    const refreshButton = fixture.nativeElement.querySelector(
      '.stop-info__refresh',
    ) as HTMLElement | null;

    if (!refreshButton) {
      throw new Error('Refresh button not found');
    }

    refreshButton.dispatchEvent(new MouseEvent('click'));

    expect(facade.refresh).toHaveBeenCalled();
  }));

  it('announces the loading status as a polite live region', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'loading', fallback: null });
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector(
      '.stop-info__status--loading',
    ) as HTMLElement | null;

    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(POLITE_LIVE_REGION);
  }));

  it('marks not found status as an assertive live region', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'notFound', fallback: null });
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector(
      '.stop-info__status--error',
    ) as HTMLElement | null;

    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(ASSERTIVE_LIVE_REGION);
  }));

  it('marks error status as an assertive live region', fakeAsync(() => {
    fixture = TestBed.createComponent(StopInfoComponent);
    fixture.detectChanges();
    tick();

    facade.emit({ status: 'error', fallback: null });
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector(
      '.stop-info__status--error',
    ) as HTMLElement | null;

    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(ASSERTIVE_LIVE_REGION);
  }));
});

function buildPosition(latitude: number, longitude: number): GeolocationPosition {
  const coords = {
    latitude,
    longitude,
    accuracy: 0,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  } satisfies GeolocationCoordinates;

  return {
    coords,
    timestamp: Date.now(),
    toJSON: () => ({ coords, timestamp: Date.now() }),
  } satisfies GeolocationPosition;
}

function permissionDeniedError(): GeolocationPositionError {
  return {
    code: 1,
    message: 'denied',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } satisfies GeolocationPositionError;
}
