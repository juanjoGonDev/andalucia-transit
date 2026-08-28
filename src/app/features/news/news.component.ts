import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import {
  ConsortiumCatalogEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';
import { NewsArticle, NewsFacade, NewsState } from '@domain/news/news.facade';
import { NewsSortOrder, getNewsUiCopy } from '@features/news/news-ui.copy';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import { buildNewsDetailNavigation } from '@shared/navigation/navigation.util';

const NEWS_STATUS_TRANSLATIONS = {
  loading: 'news.status.loading',
  refreshing: 'news.status.refreshing',
  error: 'news.status.error',
  stale: 'news.status.stale',
  retry: 'news.status.retry'
} as const;

const PAGE_SIZE = 8;
const EMPTY_AREAS: readonly ConsortiumCatalogEntry[] = Object.freeze([]);

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AppLayoutContentDirective,
    AccessibleButtonDirective
  ],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsComponent {
  private readonly facade = inject(NewsFacade);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly consortiumCatalog = inject(ConsortiumCatalogService);

  protected readonly state$ = this.facade.state$;
  protected readonly areas$: Observable<readonly ConsortiumCatalogEntry[]> = this.consortiumCatalog
    .loadConsortiums()
    .pipe(
      catchError(() => of(EMPTY_AREAS)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  protected readonly translation = APP_CONFIG.translationKeys.news;
  protected readonly statusTranslation = NEWS_STATUS_TRANSLATIONS;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.news;
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly selectedArea = signal<number | null>(null);
  protected readonly sortOrder = signal<NewsSortOrder>('newest');
  protected readonly currentPage = signal(1);

  protected uiCopy() {
    return getNewsUiCopy(this.translate.currentLang);
  }

  protected refresh(): void {
    this.facade.refresh();
  }

  protected isBusy(state: NewsState): boolean {
    return state.status === 'loading' || state.status === 'refreshing';
  }

  protected categories(state: NewsState): readonly string[] {
    return Object.freeze(
      Array.from(
        new Set(
          state.articles
            .map((article) => article.category)
            .filter((category): category is string => Boolean(category))
        )
      ).sort((left, right) => left.localeCompare(right))
    );
  }

  protected availableAreas(
    state: NewsState,
    catalog: readonly ConsortiumCatalogEntry[]
  ): readonly ConsortiumCatalogEntry[] {
    const availableIds = new Set(state.articles.map((article) => article.consortiumId));
    return catalog.filter((entry) => availableIds.has(entry.id));
  }

  protected filteredArticles(state: NewsState): readonly NewsArticle[] {
    const category = this.selectedCategory();
    const area = this.selectedArea();
    const order = this.sortOrder();
    const filtered = state.articles.filter(
      (article) =>
        (category === null || article.category === category) &&
        (area === null || article.consortiumId === area)
    );

    return filtered.sort((left, right) => compareArticles(left, right, order));
  }

  protected pagedArticles(state: NewsState): readonly NewsArticle[] {
    const articles = this.filteredArticles(state);
    const page = Math.min(this.currentPage(), this.pageCount(state));
    const start = (page - 1) * PAGE_SIZE;
    return articles.slice(start, start + PAGE_SIZE);
  }

  protected pageCount(state: NewsState): number {
    return Math.max(1, Math.ceil(this.filteredArticles(state).length / PAGE_SIZE));
  }

  protected displayPage(state: NewsState): number {
    return Math.min(this.currentPage(), this.pageCount(state));
  }

  protected selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
    this.resetPage();
  }

  protected selectArea(consortiumId: number | null): void {
    this.selectedArea.set(consortiumId);
    this.resetPage();
  }

  protected selectSortOrder(order: NewsSortOrder): void {
    this.sortOrder.set(order);
    this.resetPage();
  }

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(state: NewsState): void {
    const lastPage = this.pageCount(state);
    this.currentPage.update((page) => Math.min(lastPage, page + 1));
  }

  protected canGoPrevious(state: NewsState): boolean {
    return this.displayPage(state) > 1;
  }

  protected canGoNext(state: NewsState): boolean {
    return this.displayPage(state) < this.pageCount(state);
  }

  protected areaName(
    article: NewsArticle,
    catalog: readonly ConsortiumCatalogEntry[]
  ): string | null {
    return catalog.find((entry) => entry.id === article.consortiumId)?.name ?? null;
  }

  protected openArticle(article: NewsArticle): void {
    const navigation = buildNewsDetailNavigation(article.consortiumId, article.id);
    void this.router.navigate(navigation.commands);
  }

  protected trackArticle(_: number, article: NewsArticle): string {
    return `${article.consortiumId}:${article.id}`;
  }

  protected trackArea(_: number, area: ConsortiumCatalogEntry): number {
    return area.id;
  }

  private resetPage(): void {
    this.currentPage.set(1);
  }
}

function compareArticles(left: NewsArticle, right: NewsArticle, order: NewsSortOrder): number {
  const leftTimestamp = parseTimestamp(left.publishedAt);
  const rightTimestamp = parseTimestamp(right.publishedAt);
  const dateComparison =
    order === 'newest' ? rightTimestamp - leftTimestamp : leftTimestamp - rightTimestamp;

  return (
    dateComparison ||
    left.order - right.order ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  );
}

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
