import { RouteSearchSelection } from '@domain/route-search/route-search-state.service';

export type PreviewEntryKind = 'previous' | 'next';

export interface PreviewRelativeLabel {
  readonly key: string;
  readonly params: { readonly time: string };
}

export interface RecentSearchPreviewEntry {
  readonly id: string;
  readonly kind: PreviewEntryKind;
  readonly lineCode: string;
  readonly departureTime: Date;
  readonly relativeLabel: PreviewRelativeLabel | null;
}

export type RecentSearchPreviewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'disabled' }
  | { readonly status: 'ready'; readonly entries: readonly RecentSearchPreviewEntry[] };

export interface RecentSearchItem {
  readonly id: string;
  readonly originName: string;
  readonly destinationName: string;
  readonly effectiveSelection: RouteSearchSelection;
  readonly effectiveQueryDate: Date;
  readonly showTodayNotice: boolean;
  readonly preview: RecentSearchPreviewState;
}
