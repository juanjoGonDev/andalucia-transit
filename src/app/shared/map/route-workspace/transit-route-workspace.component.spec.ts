import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
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
