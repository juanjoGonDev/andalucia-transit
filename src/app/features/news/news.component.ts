import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { NewsArticle, NewsFacade, NewsState } from '@domain/news/news.facade';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';

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

  protected readonly state$ = this.facade.state$;
  protected readonly translation = APP_CONFIG.translationKeys.news;
  protected readonly statusTranslation = NEWS_STATUS_TRANSLATIONS;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.news;

  protected refresh(): void {
    this.facade.refresh();
  }

  protected isBusy(state: NewsState): boolean {
    return state.status === 'loading' || state.status === 'refreshing';
  }

  protected trackArticle(_: number, article: NewsArticle): string {
    return article.id;
  }
}
