import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { APP_LAYOUT_CONTEXT } from '@shared/layout/app-layout-context.token';
import { AppShellTopActionsComponent } from '@shared/layout/top-actions/app-shell-top-actions.component';

const MAIN_CONTENT_ID = 'app-main-content';
const SKIP_LINK_LABEL_KEY = 'layout.skipToContent';
const FRAGMENT_PREFIX = '#';
const MAIN_ROLE = 'main';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [
    AppShellTopActionsComponent,
    RouterOutlet,
    TranslateModule,
    AccessibleButtonDirective
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AppLayoutContextStore,
    {
      provide: APP_LAYOUT_CONTEXT,
      useExisting: AppLayoutContextStore
    }
  ],
  host: {
    class: 'app-shell'
  }
})
export class AppLayoutComponent implements AfterViewInit, OnDestroy {
  private readonly contextStore = inject(AppLayoutContextStore);
  @ViewChild('mainContent', { static: true }) private readonly mainContent?: ElementRef<HTMLElement>;
  protected readonly mainContentId = MAIN_CONTENT_ID;
  protected readonly skipLinkLabelKey = SKIP_LINK_LABEL_KEY;
  protected readonly mainContentRole = MAIN_ROLE;

  ngAfterViewInit(): void {
    this.contextStore.setFocusMainContentHandler(() => this.focusMainContent());
  }

  ngOnDestroy(): void {
    this.contextStore.clearFocusMainContentHandler();
  }

  protected get mainContentFragment(): string {
    return `${FRAGMENT_PREFIX}${this.mainContentId}`;
  }

  protected focusMainContent(): void {
    const element = this.mainContent?.nativeElement ?? null;

    if (!element || !element.isConnected) {
      return;
    }

    element.focus({ preventScroll: false });
  }
}
