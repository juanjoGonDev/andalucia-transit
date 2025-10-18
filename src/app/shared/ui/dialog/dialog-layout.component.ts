import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dialog-layout',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dialog-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-dialog' }
})
export class DialogLayoutComponent {
  @Input({ required: true }) titleKey!: string;
  @Input() descriptionKey: string | null = null;
}
