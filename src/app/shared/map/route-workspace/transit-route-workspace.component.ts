import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';

@Component({
  selector: 'app-transit-route-workspace',
  standalone: true,
  imports: [CommonModule, RouteMapComponent],
  templateUrl: './transit-route-workspace.component.html',
  styleUrl: './transit-route-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransitRouteWorkspaceComponent {
  @Input({ required: true }) routeId = '';
  @Input() coordinates: readonly RouteLineCoordinate[] = [];
  @Input() stops: readonly RouteLineStop[] = [];
  @Input() selectedStopId: string | null = null;
  @Input() accessibleLabel = '';
  @Input() stopsTitle = '';
  @Input() stopDetailsLabel = '';
  @Input() mapUnavailableLabel = '';

  @Output() readonly stopSelected = new EventEmitter<string>();
  @Output() readonly stopDetails = new EventEmitter<string>();

  protected readonly trackStop = (_: number, stop: RouteLineStop): string => stop.stopId;

  protected selectStop(stopId: string): void {
    this.stopSelected.emit(stopId);
  }

  protected openStop(stopId: string): void {
    this.stopDetails.emit(stopId);
  }
}
