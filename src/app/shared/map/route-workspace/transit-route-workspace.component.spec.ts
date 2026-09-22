import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import type { LineRouteWorkspaceStop } from '@domain/lines/line-route-workspace.service';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';
import { TransitRouteWorkspaceComponent } from '@shared/map/route-workspace/transit-route-workspace.component';

@Component({
  selector: 'app-route-map',
  standalone: true,
  template: ''
})
class RouteMapStubComponent {
  @Input() routeId = '';
  @Input() coordinates: readonly RouteLineCoordinate[] = [];
  @Input() stops: readonly RouteLineStop[] = [];
  @Input() originStopIds: readonly string[] = [];
  @Input() destinationStopIds: readonly string[] = [];
  @Input() selectedStopId: string | null = null;
  @Input() accessibleLabel = '';
  @Input() stopDetailsLabel = '';
  @Output() readonly stopSelected = new EventEmitter<string>();
  @Output() readonly stopDetails = new EventEmitter<string>();
}

describe('TransitRouteWorkspaceComponent', () => {
  let fixture: ComponentFixture<TransitRouteWorkspaceComponent>;

  const stops: readonly RouteLineStop[] = [
    createStop('stop-a', 1, 'Stop A'),
    createStop('stop-b', 2, 'Stop B')
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransitRouteWorkspaceComponent, RouteMapStubComponent]
    })
      .overrideComponent(TransitRouteWorkspaceComponent, {
        remove: { imports: [RouteMapComponent] },
        add: { imports: [RouteMapStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(TransitRouteWorkspaceComponent);
    fixture.componentInstance.routeId = 'line-1';
    fixture.componentInstance.coordinates = [
      { latitude: 37.1, longitude: -5.9 },
      { latitude: 37.2, longitude: -5.8 }
    ];
    fixture.componentInstance.stops = stops;
    fixture.componentInstance.stopsTitle = 'Stops';
    fixture.componentInstance.stopDetailsLabel = 'More information';
    fixture.componentInstance.mapUnavailableLabel = 'Map unavailable';
  });

  it('keeps map and stop selection on one shared component contract', () => {
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.stopSelected.subscribe(selected);
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(RouteMapStubComponent))
      .componentInstance as RouteMapStubComponent;
    map.stopSelected.emit('stop-b');
    fixture.debugElement
      .queryAll(By.css('.transit-route-workspace__stop-select'))[0]
      ?.triggerEventHandler('click');

    expect(selected).toHaveBeenCalledWith('stop-b');
    expect(selected).toHaveBeenCalledWith('stop-a');
  });

  it('emits stop detail navigation intents with explicit accessible names', () => {
    const details = jasmine.createSpy('details');
    fixture.componentInstance.stopDetails.subscribe(details);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('.transit-route-workspace__stop-details'));
    expect(buttons.length).toBe(2);
    expect((buttons[0]?.nativeElement as HTMLButtonElement).getAttribute('aria-label')).toBe(
      'More information: Stop A'
    );

    buttons[1]?.triggerEventHandler('click');
    expect(details).toHaveBeenCalledWith('stop-b');
  });

  it('keeps ordered stops usable when route geometry is unavailable', () => {
    fixture.componentInstance.coordinates = [];
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(RouteMapStubComponent))).toBeNull();
    expect(fixture.debugElement.query(By.css('.transit-route-workspace__map-unavailable'))).not.toBeNull();
    expect(fixture.debugElement.queryAll(By.css('.transit-route-workspace__stop-row')).length).toBe(2);
  });

  it('differentiates the searched origin and destination in the list and forwards roles to the map', () => {
    fixture.componentInstance.originStopIds = ['stop-a'];
    fixture.componentInstance.destinationStopIds = ['stop-b'];
    fixture.componentInstance.originMarkerLabel = 'Origen';
    fixture.componentInstance.destinationMarkerLabel = 'Destino';
    fixture.componentInstance.stopOriginLabel = (name) => `Origen de la búsqueda: ${name}`;
    fixture.componentInstance.stopDestinationLabel = (name) => `Destino de la búsqueda: ${name}`;
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(RouteMapStubComponent))
      .componentInstance as RouteMapStubComponent;
    expect(map.originStopIds).toEqual(['stop-a']);
    expect(map.destinationStopIds).toEqual(['stop-b']);

    const rows = fixture.debugElement.queryAll(By.css('.transit-route-workspace__stop-row'));
    expect(rows[0]?.nativeElement.classList).toContain('transit-route-workspace__stop-row--origin');
    expect(rows[1]?.nativeElement.classList).toContain(
      'transit-route-workspace__stop-row--destination'
    );

    const selectButtons = fixture.debugElement.queryAll(
      By.css('.transit-route-workspace__stop-select')
    );
    expect((selectButtons[0]?.nativeElement as HTMLButtonElement).getAttribute('aria-label')).toBe(
      'Origen de la búsqueda: Stop A'
    );
    expect((selectButtons[1]?.nativeElement as HTMLButtonElement).getAttribute('aria-label')).toBe(
      'Destino de la búsqueda: Stop B'
    );

    const tags = fixture.debugElement.queryAll(By.css('.transit-route-workspace__stop-tag'));
    expect(tags.length).toBe(2);
  });

  it('shows the nucleus ordinal per stop and omits stops without nucleus data', () => {
    fixture.componentInstance.stops = [
      { ...stops[0], nucleusName: 'La Gangosa', nucleusOrdinal: 1 } as LineRouteWorkspaceStop,
      { ...stops[1], nucleusName: 'La Gangosa', nucleusOrdinal: 2 } as LineRouteWorkspaceStop
    ];
    fixture.componentInstance.stopNucleusOrdinalLabel = (ordinal, nucleus) =>
      `${ordinal}.ª parada de ${nucleus}`;
    fixture.detectChanges();

    const badges = fixture.debugElement.queryAll(
      By.css('.transit-route-workspace__stop-nucleus')
    );
    expect(badges.map((badge) => (badge.nativeElement as HTMLElement).textContent.trim())).toEqual([
      '1.ª parada de La Gangosa',
      '2.ª parada de La Gangosa'
    ]);
  });

  it('does not render the ordinal badge when the builder or nucleus data is missing', () => {
    fixture.componentInstance.stops = [
      { ...stops[0], nucleusName: 'La Gangosa', nucleusOrdinal: 1 } as LineRouteWorkspaceStop,
      { ...stops[1] }
    ];
    fixture.componentInstance.stopNucleusOrdinalLabel = (ordinal, nucleus) =>
      `${ordinal}.ª parada de ${nucleus}`;
    fixture.detectChanges();

    const badges = fixture.debugElement.queryAll(
      By.css('.transit-route-workspace__stop-nucleus')
    );
    expect(badges.length).toBe(1);
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
