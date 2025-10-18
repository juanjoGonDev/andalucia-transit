import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { AppShellTopActionsComponent } from '../top-actions/app-shell-top-actions.component';
import { AppLayoutContextStore } from '../app-layout-context.store';
import { APP_LAYOUT_CONTEXT } from '../app-layout-context.token';
import { AccessibleButtonDirective } from '../../a11y/accessible-button.directive';

const MAIN_CONTENT_ID = 'app-main-content';
const SKIP_LINK_LABEL_KEY = 'layout.skipToContent';

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
export class AppLayoutComponent {
  private readonly contextStore = inject(AppLayoutContextStore);
  private readonly documentRef = inject(DOCUMENT);
  protected readonly mainContentId = MAIN_CONTENT_ID;
  protected readonly skipLinkLabelKey = SKIP_LINK_LABEL_KEY;

  protected focusMainContent(): void {
    if (!this.documentRef) {
      return;
    }

    const element = this.documentRef.getElementById(this.mainContentId);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.focus({ preventScroll: false });
  }
}
