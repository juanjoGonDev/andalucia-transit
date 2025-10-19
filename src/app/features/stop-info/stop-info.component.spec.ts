import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { StopInfoFacade, StopInformationDetail, StopInformationState } from '../../domain/stops/stop-info.facade';
import { StopInfoComponent } from './stop-info.component';

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

describe('StopInfoComponent', () => {
  let fixture: ComponentFixture<StopInfoComponent>;
  let facade: StopInfoFacadeStub;
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
    isInactive: false
  };

  beforeEach(async () => {
    facade = new StopInfoFacadeStub();
    paramMapSubject = new BehaviorSubject(convertToParamMap({ consortiumId: '7', stopNumber: '56' }));
    const routerStub = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerStub.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [
        StopInfoComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: StopInfoFacade, useValue: facade },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject.asObservable() } },
        { provide: Router, useValue: routerStub }
      ]
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

    const titleElement = fixture.nativeElement.querySelector('.stop-info__card-title') as HTMLElement | null;
    const tagElements = fixture.nativeElement.querySelectorAll('.stop-info__tag');

    expect(titleElement?.textContent?.trim()).toBe('Campus Universitario-I');
    expect(tagElements.length).toBe(1);
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

    const refreshButton = fixture.nativeElement.querySelector('.stop-info__refresh') as HTMLElement | null;

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

    const statusElement = fixture.nativeElement.querySelector('.stop-info__status--loading') as HTMLElement | null;

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

    const statusElement = fixture.nativeElement.querySelector('.stop-info__status--error') as HTMLElement | null;

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

    const statusElement = fixture.nativeElement.querySelector('.stop-info__status--error') as HTMLElement | null;

    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(ASSERTIVE_LIVE_REGION);
  }));
});
