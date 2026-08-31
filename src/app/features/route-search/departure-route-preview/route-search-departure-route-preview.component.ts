import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  LineRouteWorkspaceRequest,
  LineRouteWorkspaceService,
  LineRouteWorkspaceViewModel
} from '@domain/lines/line-route-workspace.service';
import { RouteSearchDepartureView } from '@domain/route-search/route-search-results.service';
import { TransitRouteWorkspaceComponent } from '@shared/map/route-workspace/transit-route-workspace.component';
import {
  TransitRouteWorkspaceCopy,
  getTransitRouteWorkspaceCopy
} from '@shared/map/route-workspace/transit-route-workspace.copy';
import { buildStopDetailNavigation } from '@shared/navigation/navigation.util';

type RoutePreviewState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly viewModel: LineRouteWorkspaceViewModel };

interface RoutePreviewLoadResult {
  readonly key: string;
  readonly state: RoutePreviewState;
}

@Component({
  selector: 'app-route-search-departure-route-preview',
  standalone: true,
  imports: [CommonModule, TranslateModule, TransitRouteWorkspaceComponent],
  templateUrl: './route-search-departure-route-preview.component.html',
  styleUrl: './route-search-departure-route-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchDepartureRoutePreviewComponent implements OnChanges {
  @Input({ required: true }) consortiumId = 0;
  @Input({ required: true }) departure: RouteSearchDepartureView | null = null;

  private readonly routeWorkspace = inject(LineRouteWorkspaceService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadRequest = new Subject<LineRouteWorkspaceRequest>();
  private contextKey = '';

  protected readonly expanded = signal(false);
  protected readonly selectedStopId = signal<string | null>(null);
  protected readonly previewState = signal<RoutePreviewState>({ status: 'idle' });

  constructor() {
    this.loadRequest
      .pipe(
        switchMap((request) => {
          const key = buildRequestKey(request);
          return this.routeWorkspace.load(request).pipe(
            map(
              (viewModel): RoutePreviewLoadResult => ({
                key,
                state: { status: 'ready', viewModel }
              })
            ),
            startWith<RoutePreviewLoadResult>({ key, state: { status: 'loading' } }),
            catchError(() =>
              of<RoutePreviewLoadResult>({ key, state: { status: 'error' } })
            )
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (result.key !== this.contextKey) {
          return;
        }

        this.previewState.set(result.state);
      });
  }

  ngOnChanges(): void {
    const nextKey = this.resolveRequestKey();
    if (nextKey === this.contextKey) {
      return;
    }

    this.contextKey = nextKey;
    this.previewState.set({ status: 'idle' });
    this.selectedStopId.set(null);

    if (this.expanded()) {
      this.ensureLoaded();
    }
  }

  protected workspaceCopy(): TransitRouteWorkspaceCopy {
    return getTransitRouteWorkspaceCopy(this.translate.currentLang);
  }

  protected isLoading(): boolean {
    return this.previewState().status === 'loading';
  }

  protected isError(): boolean {
    return this.previewState().status === 'error';
  }

  protected readyViewModel(): LineRouteWorkspaceViewModel | null {
    const state = this.previewState();
    return state.status === 'ready' ? state.viewModel : null;
  }

  protected onToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement | null;
    const isOpen = details?.open ?? false;
    this.expanded.set(isOpen);

    if (isOpen) {
      this.ensureLoaded();
    }
  }

  protected retry(): void {
    this.previewState.set({ status: 'idle' });
    this.ensureLoaded();
  }

  protected selectStop(stopId: string): void {
    this.selectedStopId.set(stopId);
  }

  protected openStop(stopId: string): void {
    const request = this.resolveRequest();
    if (!request) {
      return;
    }

    this.selectedStopId.set(stopId);
    const navigation = buildStopDetailNavigation(request.consortiumId, stopId);
    void this.router.navigate(navigation.commands, { queryParams: navigation.queryParams });
  }

  protected workspaceRouteId(viewModel: LineRouteWorkspaceViewModel): string {
    const direction = viewModel.resolvedDirection ?? this.departure?.direction ?? 'primary';
    return `${viewModel.detail.lineId}:${direction}`;
  }

  private ensureLoaded(): void {
    const request = this.resolveRequest();
    if (!request) {
      return;
    }

    const state = this.previewState();
    if (state.status === 'loading' || state.status === 'ready') {
      return;
    }

    this.loadRequest.next(request);
  }

  private resolveRequestKey(): string {
    const request = this.resolveRequest();
    return request ? buildRequestKey(request) : '';
  }

  private resolveRequest(): LineRouteWorkspaceRequest | null {
    const departure = this.departure;
    if (
      !departure ||
      !Number.isSafeInteger(this.consortiumId) ||
      this.consortiumId <= 0 ||
      !departure.lineId.trim() ||
      !Number.isSafeInteger(departure.direction)
    ) {
      return null;
    }

    return {
      consortiumId: this.consortiumId,
      lineId: departure.lineId,
      direction: departure.direction
    };
  }
}

function buildRequestKey(request: LineRouteWorkspaceRequest): string {
  return `${request.consortiumId}:${request.lineId}:${request.direction ?? 'primary'}`;
}
