import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import type { LineRouteWorkspaceStop } from '@domain/lines/line-route-workspace.service';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';

type StopLabelBuilder = (name: string) => string;
type NucleusOrdinalLabelBuilder = (ordinal: number, nucleus: string) => string;

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
  @Input() originStopIds: readonly string[] = [];
  @Input() destinationStopIds: readonly string[] = [];
  @Input() selectedStopId: string | null = null;
  @Input() accessibleLabel = '';
  @Input() stopsTitle = '';
  @Input() stopDetailsLabel = '';
  @Input() mapUnavailableLabel = '';
  @Input() originMarkerLabel = '';
  @Input() destinationMarkerLabel = '';
  @Input() stopOriginLabel: StopLabelBuilder | null = null;
  @Input() stopDestinationLabel: StopLabelBuilder | null = null;
  @Input() stopNucleusOrdinalLabel: NucleusOrdinalLabelBuilder | null = null;

  @Output() readonly stopSelected = new EventEmitter<string>();
  @Output() readonly stopDetails = new EventEmitter<string>();

  protected readonly trackStop = (_: number, stop: RouteLineStop): string => stop.stopId;

  protected selectStop(stopId: string): void {
    this.stopSelected.emit(stopId);
  }

  protected openStop(stopId: string): void {
    this.stopDetails.emit(stopId);
  }

  protected isOriginStop(stopId: string): boolean {
    return this.originStopIds.includes(stopId);
  }

  protected isDestinationStop(stopId: string): boolean {
    return this.destinationStopIds.includes(stopId);
  }

  protected stopSelectAriaLabel(stop: RouteLineStop): string | null {
    if (this.isOriginStop(stop.stopId) && this.stopOriginLabel) {
      return this.stopOriginLabel(stop.name);
    }

    if (this.isDestinationStop(stop.stopId) && this.stopDestinationLabel) {
      return this.stopDestinationLabel(stop.name);
    }

    return null;
  }

  protected stopNucleusBadge(stop: RouteLineStop): string | null {
    const enrichedStop = stop as LineRouteWorkspaceStop;
    const nucleus = enrichedStop.nucleusName?.trim();
    const ordinal = enrichedStop.nucleusOrdinal;

    if (!this.stopNucleusOrdinalLabel || !nucleus || !ordinal || ordinal < 1) {
      return null;
    }

    return this.stopNucleusOrdinalLabel(ordinal, nucleus);
  }
}
