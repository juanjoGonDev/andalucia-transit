import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import type { LineRouteWorkspaceViewModel } from '@domain/lines/line-route-workspace.service';
import { LineRouteWorkspaceService } from '@domain/lines/line-route-workspace.service';
import type { RouteSearchDepartureView } from '@domain/route-search/route-search-results.service';
import { RouteSearchDepartureRoutePreviewComponent } from '@features/route-search/departure-route-preview/route-search-departure-route-preview.component';
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
  readonly load = jasmine
    .createSpy('load')
    .and.callFake(() => of(createViewModel(0)));
}

describe('RouteSearchDepartureRoutePreviewComponent', () => {
  let fixture: ComponentFixture<RouteSearchDepartureRoutePreviewComponent>;
  let workspaceService: LineRouteWorkspaceServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouteSearchDepartureRoutePreviewComponent,
        TransitRouteWorkspaceStubComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideRouter([]),
        { provide: LineRouteWorkspaceService, useClass: LineRouteWorkspaceServiceStub }
      ]
    })
      .overrideComponent(RouteSearchDepartureRoutePreviewComponent, {
        remove: { imports: [TransitRouteWorkspaceComponent] },
        add: { imports: [TransitRouteWorkspaceStubComponent] }
      })
      .compileComponents();

    workspaceService = TestBed.inject(
      LineRouteWorkspaceService
    ) as unknown as LineRouteWorkspaceServiceStub;
    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');

    fixture = TestBed.createComponent(RouteSearchDepartureRoutePreviewComponent);
    fixture.componentInstance.consortiumId = 7;
    fixture.componentInstance.departure = createDeparture(0);
    fixture.detectChanges();
  });

  it('loads the exact line and direction only after the disclosure opens', () => {
    expect(workspaceService.load).not.toHaveBeenCalled();

    toggleDisclosure(true);

    expect(workspaceService.load).toHaveBeenCalledOnceWith({
      consortiumId: 7,
      lineId: 'line-1',
      direction: 0
    });
    expect(fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent))).not.toBeNull();
  });

  it('keeps the loaded route cached across close and reopen', () => {
    toggleDisclosure(true);
    toggleDisclosure(false);

    expect(fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent))).toBeNull();

    toggleDisclosure(true);

    expect(workspaceService.load).toHaveBeenCalledTimes(1);
    expect(fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent))).not.toBeNull();
  });

  it('cancels the previous context and loads a changed direction while open', () => {
    toggleDisclosure(true);
    workspaceService.load.calls.reset();
    workspaceService.load.and.callFake((request) => of(createViewModel(request.direction ?? 0)));

    fixture.componentInstance.departure = createDeparture(1);
    fixture.detectChanges();

    expect(workspaceService.load).toHaveBeenCalledOnceWith({
      consortiumId: 7,
      lineId: 'line-1',
      direction: 1
    });
  });

  it('routes stop details through consortium-aware navigation', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    toggleDisclosure(true);

    const workspace = fixture.debugElement.query(By.directive(TransitRouteWorkspaceStubComponent))
      .componentInstance as TransitRouteWorkspaceStubComponent;
    workspace.stopDetails.emit('stop-b');

    expect(navigateSpy).toHaveBeenCalled();
  });

  function toggleDisclosure(open: boolean): void {
    const details = fixture.debugElement.query(By.css('.route-search-route-preview'));
    details.triggerEventHandler('toggle', { currentTarget: { open } });
    fixture.detectChanges();
  }
});

function createDeparture(direction: number): RouteSearchDepartureView {
  return {
    id: `service-${direction}`,
    lineId: 'line-1',
    lineCode: 'M-301',
    direction,
    destination: direction === 0 ? 'Beta Terminal' : 'Alpha Station',
    originStopId: 'stop-a',
    arrivalTime: new Date('2026-08-28T18:30:00Z'),
    relativeLabel: '5m',
    waitTimeSeconds: 300,
    kind: 'upcoming',
    isNext: true,
    isMostRecentPast: false,
    isAccessible: false,
    isUniversityOnly: false,
    isHolidayService: false,
    showUpcomingProgress: false,
    progressPercentage: 0,
    pastProgressPercentage: 0,
    destinationArrivalTime: new Date('2026-08-28T19:00:00Z'),
    travelDurationLabel: '30m'
  };
}

function createViewModel(direction: number): LineRouteWorkspaceViewModel {
  const stops = [
    createStop('stop-a', direction, 1),
    createStop('stop-b', direction, 2)
  ] as const;

  return {
    detail: {
      lineId: 'line-1',
      code: 'M-301',
      name: 'Line One',
      mode: 'Bus',
      coordinates: []
    },
    stops,
    coordinates: stops.map((stop) => ({
      latitude: stop.latitude,
      longitude: stop.longitude
    })),
    resolvedDirection: direction
  };
}

function createStop(stopId: string, direction: number, order: number): RouteLineStop {
  return {
    stopId,
    lineId: 'line-1',
    direction,
    order,
    nucleusId: `nucleus-${stopId}`,
    zoneId: null,
    latitude: 37 + order / 100,
    longitude: -5 - order / 100,
    name: stopId
  };
}
