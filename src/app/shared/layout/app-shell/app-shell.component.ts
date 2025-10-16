import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppLayoutComponent } from '../app-layout/app-layout.component';

import { AppLayoutComponent } from '../app-layout/app-layout.component';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, AppLayoutComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {}
