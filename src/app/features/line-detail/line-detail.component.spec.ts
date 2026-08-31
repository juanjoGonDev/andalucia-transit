import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import {
  LineFavorite,
  LineFavoritesFacade
} from '@domain/lines/line-favorites.facade';
import {
  LineRouteWorkspaceService,
  LineRouteWorkspaceViewModel
} from '@domain/lines/line-route-workspace.service';
import { LineDetailComponent } from '@features/line-detail/line-detail.component';
import { TransitRouteWorkspaceComponent } from '@shared/map/route-workspace/transit-route-workspace.component';

@Component({
  selector: 'app-transit-route-workspace',
  standalone: true,
  template: ''
})
class TransitRouteWorkspaceStubComponent {
  @Input() routeId = '';
  @Input() coordinates: readonly RouteLineCoordinate[] = [];
  @Input() stops: readonly RouteLineStop[] = [];
  @Input() selectedStopId: string | null = null;
  @Input() accessibleLabel = '';
  @Input() stopsTitle = '';
  @Input() stopDetailsLabel = '';
  @Input() mapUnavailableLabel = '';
  @Output() readonly stopSelected = new EventEmitter<string>();
  @Output() readonly stopDetails = new EventEmitter<string>();
}

class LineRouteWorkspaceServiceStub {
  readonly viewModel: LineRouteWorkspaceViewModel = {
    detail: {
      lineId: 'line-1',
      code: 'L1',
      name: 'Line One',
      mode: 'Bus',
      coordinates: [
        { latitude: 37.1, longitude: -5.9 },
        { latitude: 37.2, longitude: -5.8 }
      ]
    },
    coordinates: [
      { latitude: 37.1, longitude: -5.9 },
      { latitude: 37.2, longitude: -5.8 }
    ],
    stops: [
      createStop('stop-a', 1, 'Stop A'),
      createStop('stop-b', 2, 'Stop B')
    ],
    resolvedDirection: 0
  };

  load() {
    return of(this.viewModel);
  }
}

class LineFavoritesFacadeStub {
  private readonly subject = new BehaviorSubject<readonly LineFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly toggle = jasmine.createSpy('toggle');

  emit(favorites: readonly LineFavorite[]): void {
    this.subject.next(favorites);
  }
}

const activatedRoute = {
  paramMap: of(convertToParamMap({ consortiumId: '7', lineId: 'line-1' })),
  snapshot: {
    paramMap: convertToParamMap({ consortiumId: '7', lineId: 'line-1' })
  }
};

const languageService = {
  currentLanguage: signal<'es' | 'en'>('es').asReadonly()
};

describe('LineDetailComponent', () => {
  let fixture: ComponentFixture<LineDetailComponent>;
  let lineFavorites: LineFavoritesFacadeStub;

  beforeEach(async () => {
    lineFavorites = new LineFavoritesFacadeStub();

    await TestBed.configureTestingModule({
      imports: [LineDetailComponent, TransitRouteWorkspaceStubComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: LineRouteWorkspaceService, useClass: LineRouteWorkspaceServiceStub },
        { provide: LineFavoritesFacade, useValue: lineFavorites },
        { provide: LanguageService, useValue: languageService }
      ]
    })
      .overrideComponent(LineDetailComponent, {
        remove: { imports: [TransitRouteWorkspaceComponent] },
        add: { imports: [TransitRouteWorkspaceStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(LineDetailComponent);
  });

  it('delegates the route map and ordered stop experience to the reusable workspace', () => {
    fixture.detectChanges();

    const workspace = fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent))
      .componentInstance as TransitRouteWorkspaceStubComponent;

    expect(workspace.routeId).toBe('line-1');
    expect(workspace.stops.map((stop) => stop.stopId)).toEqual(['stop-a', 'stop-b']);
    expect(workspace.coordinates.length).toBe(2);
    expect(workspace.stopsTitle).toBe('Paradas');
  });

  it('synchronizes reusable workspace stop selection with line-detail state', () => {
    fixture.detectChanges();

    const workspaceDebug = fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent));
    const workspace = workspaceDebug.componentInstance as TransitRouteWorkspaceStubComponent;
    workspace.stopSelected.emit('stop-b');
    fixture.detectChanges();

    expect(workspace.selectedStopId).toBe('stop-b');
  });

  it('navigates workspace stop-details intent through the consortium-aware owner', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const workspace = fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent))
      .componentInstance as TransitRouteWorkspaceStubComponent;

    workspace.stopDetails.emit('stop-b');

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/', APP_CONFIG.routes.stopDetailBase, 'stop-b'],
      { queryParams: { consortiumId: '7' } }
    );
  });

  it('toggles the current line through the canonical line-favorites facade', () => {
    fixture.detectChanges();

    const favoriteButton = fixture.nativeElement.querySelector(
      '.line-detail__favorite'
    ) as HTMLButtonElement;
    expect(favoriteButton.getAttribute('aria-pressed')).toBe('false');

    favoriteButton.click();

    expect(lineFavorites.toggle).toHaveBeenCalledOnceWith({
      consortiumId: 7,
      lineId: 'line-1',
      code: 'L1',
      name: 'Line One',
      mode: 'Bus'
    });
  });

  it('reflects favorite state emitted by another surface', () => {
    fixture.detectChanges();
    lineFavorites.emit([
      {
        id: '7|line-1',
        consortiumId: 7,
        lineId: 'line-1',
        code: 'L1',
        name: 'Line One',
        mode: 'Bus'
      }
    ]);
    fixture.detectChanges();

    const favoriteButton = fixture.nativeElement.querySelector(
      '.line-detail__favorite'
    ) as HTMLButtonElement;
    expect(favoriteButton.getAttribute('aria-pressed')).toBe('true');
  });
});

function createStop(stopId: string, order: number, name: string): RouteLineStop {
  return {
    stopId,
    lineId: 'line-1',
    direction: 0,
    order,
    nucleusId: `nucleus-${stopId}`,
    zoneId: null,
    latitude: 37 + order / 100,
    longitude: -5 - order / 100,
    name
  };
}
