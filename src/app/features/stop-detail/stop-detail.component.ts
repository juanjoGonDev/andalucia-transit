import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';

@Component({
  selector: 'app-stop-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, TranslateModule],
  templateUrl: './stop-detail.component.html',
  styleUrl: './stop-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopDetailComponent {
  protected readonly translationKeys = APP_CONFIG.translationKeys.stopDetail;
}
