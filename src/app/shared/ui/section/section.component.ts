import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, TemplateRef } from '@angular/core';
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
  @Input() appearance: 'default' | 'card' = 'default';
  @Input() actionsTemplate?: TemplateRef<unknown>;

  protected get hostClassMap(): Record<string, boolean> {
    return {
      'section--card': this.appearance === 'card'
    };
  }
}
