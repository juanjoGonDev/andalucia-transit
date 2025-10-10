import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialSymbolName } from '../types/material-symbol-name';

export interface BottomNavigationItem {
  readonly labelKey: string;
  readonly icon: MaterialSymbolName;
  readonly commands: readonly string[];
}

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomNavigationComponent {
  @Input({ required: true })
  items: readonly BottomNavigationItem[] = [];
}
