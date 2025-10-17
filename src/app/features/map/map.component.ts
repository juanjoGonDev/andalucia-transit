import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { AccessibleButtonDirective } from '../../shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '../../shared/layout/app-layout-content.directive';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    TranslateModule,
    AccessibleButtonDirective,
    AppLayoutContentDirective
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent {
  protected readonly translationKeys = APP_CONFIG.translationKeys.map;
}
