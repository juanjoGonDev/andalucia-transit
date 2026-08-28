import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LanguageService } from '@core/services/language.service';
import type {
  RouteLineCoordinate,
  RouteLineDetail,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { LineDetailComponent } from '@features/line-detail/line-detail.component';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';

@Component({
  selector: 'app-route-map',
  standalone: true,
  template: ''
})
class RouteMapStubComponent {
  @Input() routeId = 'route';
  @Input() coordinates: readonly RouteLineCoordinate[] = [];
  @Input() stops: readonly RouteLineStop[] = [];
  @Input() selectedStopId: string | null = null;
  @Input() accessibleLabel = '';
  @Input() stopDetailsLabel = '';
  @Output() readonly stopSelected = new EventEmitter<string>();
  @Output() readonly stopDetails = new EventEmitter<string>();
}

class RouteLinesApiServiceStub {
  detail: RouteLineDetail = {
    lineId: 'line-1',
    code: 'L1',
    name: 'Line One',
    mode: 'Bus',
    coordinates: [
      { latitude: 37.1, longitude: -5.9 },
      { latitude: 37.2, longitude: -5.8 }
    ]
  };

  stops: readonly RouteLineStop[] = [
    createStop('stop-a', 0, 1, 'Stop A', 37.1, -5.9),
    createStop('stop-b', 0, 2, 'Stop B', 37.2, -5.8),
    createStop('return-only', 1, 1, 'Return Stop', 37.3, -5.7)
  ];

  getLineDetail() {
    return of(this.detail);
  }

  getLineStops() {
    return of(this.stops);
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
  let routeLines: RouteLinesApiServiceStub;

  beforeEach(async () => {
    routeLines = new RouteLinesApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [LineDetailComponent, RouteMapStubComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: RouteLinesApiService, useValue: routeLines },
        { provide: LanguageService, useValue: languageService }
      ]
    })
      .overrideComponent(LineDetailComponent, {
        remove: { imports: [RouteMapComponent] },
        add: { imports: [RouteMapStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(LineDetailComponent);
  });

  it('renders only the canonical primary direction in the map and stop list', () => {
    fixture.detectChanges();

    const routeMap = fixture.debugElement.query(By.directive(RouteMapStubComponent))
      .componentInstance as RouteMapStubComponent;
    const rows = fixture.debugElement.queryAll(By.css('.line-detail__stop-row'));

    expect(routeMap.stops.map((stop) => stop.stopId)).toEqual(['stop-a', 'stop-b']);
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('Return Stop');
  });

  it('synchronizes map marker selection with the corresponding stop row', () => {
    fixture.detectChanges();

    const routeMapDebug = fixture.debugElement.query(By.directive(RouteMapStubComponent));
    const routeMap = routeMapDebug.componentInstance as RouteMapStubComponent;
    routeMap.stopSelected.emit('stop-b');
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.line-detail__stop-row'));
    const selectedRows = rows.filter((row) =>
      (row.nativeElement as HTMLElement).classList.contains('line-detail__stop-row--selected')
    );
    const selectedButton = selectedRows[0]?.query(By.css('.line-detail__stop-select'))
      ?.nativeElement as HTMLButtonElement | undefined;

    expect(selectedRows.length).toBe(1);
    expect(selectedButton?.getAttribute('aria-pressed')).toBe('true');
    expect(selectedButton?.textContent).toContain('Stop B');
  });

  it('navigates a map details action through the consortium-aware stop-detail owner', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const routeMap = fixture.debugElement.query(By.directive(RouteMapStubComponent))
      .componentInstance as RouteMapStubComponent;

    routeMap.stopDetails.emit('stop-b');

    expect(navigateSpy).toHaveBeenCalledWith(['/', 'stop', 'stop-b'], {
      queryParams: { consortiumId: '7' }
    });
  });

  it('keeps ordered stops available when line geometry cannot be drawn', () => {
    routeLines.detail = { ...routeLines.detail, coordinates: [] };
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(RouteMapStubComponent))).toBeNull();
    expect(fixture.debugElement.query(By.css('.line-detail__map-unavailable'))).not.toBeNull();
    expect(fixture.debugElement.queryAll(By.css('.line-detail__stop-row')).length).toBe(2);
  });

  it('gives every compact stop-details button an explicit accessible name', () => {
    fixture.detectChanges();

    const detailsButtons = fixture.debugElement.queryAll(By.css('.line-detail__stop-details'));
    expect(detailsButtons.length).toBe(2);
    expect(
      detailsButtons.every((entry) =>
        Boolean((entry.nativeElement as HTMLButtonElement).getAttribute('aria-label'))
      )
    ).toBeTrue();
  });
});

function createStop(
  stopId: string,
  direction: number,
  order: number,
  name: string,
  latitude: number,
  longitude: number
): RouteLineStop {
  return {
    stopId,
    lineId: 'line-1',
    direction,
    order,
    nucleusId: `nucleus-${stopId}`,
    zoneId: null,
    latitude,
    longitude,
    name
  };
}