import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppShellTopActionsComponent } from '../top-actions/app-shell-top-actions.component';
import { AppLayoutContextStore } from '../app-layout-context.store';
import { APP_LAYOUT_CONTEXT } from '../app-layout-context.token';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [AppShellTopActionsComponent, RouterOutlet],
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
}
