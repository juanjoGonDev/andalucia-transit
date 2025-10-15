import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppShellTopActionsComponent } from '../top-actions/app-shell-top-actions.component';
@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellTopActionsComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
}
