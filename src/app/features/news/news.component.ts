import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { NewsArticle, NewsFacade } from '@domain/news/news.facade';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';

const NEWS_DATE_FORMAT = 'mediumDate';
const NEWS_REFRESH_ICON = 'refresh';

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

  protected readonly layoutNavigationKey = APP_CONFIG.routes.news;
  protected readonly titleKey = APP_CONFIG.translationKeys.news.title;
  protected readonly descriptionKey = APP_CONFIG.translationKeys.news.description;
  protected readonly emptyKey = APP_CONFIG.translationKeys.news.empty;
  protected readonly updatedLabelKey = APP_CONFIG.translationKeys.news.updatedLabel;
  protected readonly readMoreLabelKey = APP_CONFIG.translationKeys.news.readMore;
  protected readonly refreshLabelKey = APP_CONFIG.translationKeys.news.refresh;
  protected readonly dateFormat = NEWS_DATE_FORMAT;
  protected readonly timezone = APP_CONFIG.data.timezone;
  protected readonly refreshIconName = NEWS_REFRESH_ICON;

  protected readonly articles$: Observable<readonly NewsArticle[]> = this.facade.articles$;

  protected trackArticle(_: number, article: NewsArticle): string {
    return article.id;
  }

  protected refresh(): void {
    this.facade.refresh();
  }
}
