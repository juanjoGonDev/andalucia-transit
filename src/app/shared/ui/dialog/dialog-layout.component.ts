import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dialog-layout',
  standalone: true,
  imports: [CommonModule, MatDialogModule, TranslateModule],
  templateUrl: './dialog-layout.component.html',
  styleUrl: './dialog-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogLayoutComponent {
  @Input({ required: true }) titleKey!: string;
  @Input() descriptionKey: string | null = null;
}
