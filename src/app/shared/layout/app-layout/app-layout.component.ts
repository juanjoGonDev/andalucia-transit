import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppShellTopActionsComponent } from '../top-actions/app-shell-top-actions.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [AppShellTopActionsComponent, RouterOutlet],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-shell'
  }
})
export class AppLayoutComponent {}
