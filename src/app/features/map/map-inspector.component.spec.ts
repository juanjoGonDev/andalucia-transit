import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import { NearbyStopsService } from '@core/services/nearby-stops.service';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { StopDirectoryService } from '@data/stops/stop-directory.service';
import { RouteOverlayFacade, RouteOverlayState } from '@domain/map/route-overlay.facade';
import { MapComponent } from '@features/map/map.component';
import { LeafletMapService } from '@shared/map/leaflet-map.service';

class EmptyTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

const IDLE_OVERLAY_STATE: RouteOverlayState = {
  status: 'idle',
  routes: [],
  errorKey: null,
  selectionKey: null,
  selectionSummary: null
};

describe('MapComponent inspector', () => {
  let fixture: ComponentFixture<MapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MapComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: EmptyTranslateLoader } })
      ],
      providers: [
        { provide: LeafletMapService, useValue: {} },
        { provide: GeolocationService, useValue: {} },
        { provide: NearbyStopsService, useValue: { getAllStops: async () => [] } },
        { provide: StopDirectoryService, useValue: {} },
        { provide: RouteLinesApiService, useValue: {} },
        {
          provide: RouteOverlayFacade,
          useValue: {
            watchOverlay: () => of(IDLE_OVERLAY_STATE),
            refresh: jasmine.createSpy('refresh')
          }
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } },
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
  });

  it('starts every inspector section closed behind an accessible icon trigger', () => {
    const inspectors = Array.from(
      fixture.nativeElement.querySelectorAll('details.map__inspector') as NodeListOf<HTMLDetailsElement>
    );

    expect(inspectors).toHaveSize(3);
    expect(inspectors.every((inspector) => !inspector.open)).toBeTrue();
    expect(
      inspectors.every((inspector) => Boolean(inspector.querySelector('summary')?.getAttribute('aria-label')))
    ).toBeTrue();
  });

  it('keeps only one inspector section expanded at a time', () => {
    const inspectors = Array.from(
      fixture.nativeElement.querySelectorAll('details.map__inspector') as NodeListOf<HTMLDetailsElement>
    );
    const firstTrigger = inspectors[0]?.querySelector('summary') as HTMLElement | null;
    const secondTrigger = inspectors[1]?.querySelector('summary') as HTMLElement | null;

    firstTrigger?.click();
    fixture.detectChanges();
    expect(inspectors[0]?.open).toBeTrue();

    secondTrigger?.click();
    fixture.detectChanges();

    expect(inspectors[0]?.open).toBeFalse();
    expect(inspectors[1]?.open).toBeTrue();
    expect(inspectors[2]?.open).toBeFalse();
  });
});
