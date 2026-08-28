import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import { NewsArticleDetail, NewsFeedService } from '@data/news/news-feed.service';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  NEWS_DETAIL_ARTICLE_PARAM,
  NEWS_DETAIL_CONSORTIUM_PARAM
} from '@shared/navigation/navigation.util';

type NewsDetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly article: NewsArticleDetail };

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, AppLayoutContentDirective],
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly newsFeed = inject(NewsFeedService);
  private readonly language = inject(LanguageService);

  protected readonly layoutNavigationKey = APP_CONFIG.routes.news;
  protected readonly translation = APP_CONFIG.translationKeys.news;
  protected readonly state$: Observable<NewsDetailState> = combineLatest([
    this.route.paramMap,
    toObservable(this.language.currentLanguage)
  ]).pipe(
    map(([params, language]) => ({
      consortiumId: Number(params.get(NEWS_DETAIL_CONSORTIUM_PARAM)),
      articleId: params.get(NEWS_DETAIL_ARTICLE_PARAM)?.trim() ?? '',
      language
    })),
    switchMap(({ consortiumId, articleId, language }) => {
      if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0 || !articleId) {
        return of<NewsDetailState>({ status: 'error' });
      }

      return this.newsFeed.loadArticle(consortiumId, articleId, language).pipe(
        map((article) => ({ status: 'ready', article }) as const),
        startWith<NewsDetailState>({ status: 'loading' }),
        catchError(() => of<NewsDetailState>({ status: 'error' }))
      );
    })
  );
}
