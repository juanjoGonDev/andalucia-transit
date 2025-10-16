import { Directive, OnDestroy, OnInit, inject } from '@angular/core';

import { DialogContext } from './dialog-context';

@Directive({
  selector: '[appDialogFooter],[uiDialogFooter]',
  standalone: true,
  host: { class: 'dialog__footer-content' }
})
export class DialogFooterDirective implements OnInit, OnDestroy {
  private readonly context = inject(DialogContext);
  private registered = false;

  ngOnInit(): void {
    this.context.addFooter();
    this.registered = true;
  }

  ngOnDestroy(): void {
    if (this.registered) {
      this.context.removeFooter();
    }
  }
}
