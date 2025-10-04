import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionComponent {
  @Input({ required: true }) titleKey!: string;
}
