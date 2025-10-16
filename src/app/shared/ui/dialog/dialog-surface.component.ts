import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DestroyRef,
  QueryList,
  inject
} from '@angular/core';
import { NgIf } from '@angular/common';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DialogDescriptionDirective } from './dialog-description.directive';
import { DialogFooterDirective } from './dialog-footer.directive';
import { DialogTitleDirective } from './dialog-title.directive';

@Component({
  selector: 'app-dialog-surface,ui-dialog-surface',
  standalone: true,
  imports: [NgIf],
  template: `
    <section class="dialog__surface">
      <header *ngIf="hasHeader" class="dialog__header">
        <ng-content select="[uiDialogTitle]"></ng-content>
        <ng-content select="[uiDialogDescription]"></ng-content>
      </header>
      <div class="dialog__content">
        <ng-content></ng-content>
      </div>
      <footer *ngIf="hasFooter" class="dialog__footer">
        <ng-content select="[uiDialogFooter]"></ng-content>
      </footer>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSurfaceComponent implements AfterContentInit {
  @ContentChildren(DialogTitleDirective, { descendants: true })
  private readonly titleDirectives!: QueryList<DialogTitleDirective>;

  @ContentChildren(DialogDescriptionDirective, { descendants: true })
  private readonly descriptionDirectives!: QueryList<DialogDescriptionDirective>;

  @ContentChildren(DialogFooterDirective, { descendants: true })
  private readonly footerDirectives!: QueryList<DialogFooterDirective>;

  protected hasHeader = false;
  protected hasFooter = false;

  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterContentInit(): void {
    this.updateSections();

    merge(
      this.titleDirectives.changes,
      this.descriptionDirectives.changes,
      this.footerDirectives.changes
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateSections());
  }

  private updateSections(): void {
    this.hasHeader =
      this.titleDirectives.length > 0 || this.descriptionDirectives.length > 0;
    this.hasFooter = this.footerDirectives.length > 0;
    this.changeDetector.markForCheck();
  }
}
