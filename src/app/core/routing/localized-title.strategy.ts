import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';

const TITLE_SEPARATOR = ' · ' as const;

@Injectable({ providedIn: 'root' })
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private lastSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.lastSnapshot) {
          this.applyTitle(this.lastSnapshot);
        }
      });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.lastSnapshot = snapshot;
    this.applyTitle(snapshot);
  }

  private applyTitle(snapshot: RouterStateSnapshot): void {
    const translationKey = this.buildTitle(snapshot);

    if (!translationKey) {
      this.title.setTitle(APP_CONFIG.appName);
      return;
    }

    const translatedTitle = this.translate.instant(translationKey).trim();
    const resolvedTitle = translatedTitle.length
      ? `${translatedTitle}${TITLE_SEPARATOR}${APP_CONFIG.appName}`
      : APP_CONFIG.appName;
    this.title.setTitle(resolvedTitle);
  }
}
