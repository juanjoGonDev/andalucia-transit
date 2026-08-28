import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { NewsArticle, NewsFacade, NewsState } from '@domain/news/news.facade';
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

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, TranslateModule, AppLayoutContentDirective, AccessibleButtonDirective],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsComponent {
  private readonly facade = inject(NewsFacade);
  private readonly router = inject(Router);

  protected readonly state$ = this.facade.state$;
  protected readonly translation = APP_CONFIG.translationKeys.news;
  protected readonly statusTranslation = NEWS_STATUS_TRANSLATIONS;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.news;
  protected readonly selectedCategory = signal<string | null>(null);

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

  protected visibleArticles(state: NewsState): readonly NewsArticle[] {
    const category = this.selectedCategory();
    return category ? state.articles.filter((article) => article.category === category) : state.articles;
  }

  protected selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
  }

  protected openArticle(article: NewsArticle): void {
    const navigation = buildNewsDetailNavigation(article.consortiumId, article.id);
    void this.router.navigate(navigation.commands);
  }

  protected trackArticle(_: number, article: NewsArticle): string {
    return `${article.consortiumId}:${article.id}`;
  }
}
