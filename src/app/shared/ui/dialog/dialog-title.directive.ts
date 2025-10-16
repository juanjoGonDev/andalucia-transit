import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

import { DialogContext } from './dialog-context';

@Directive({
  selector: '[appDialogTitle],[uiDialogTitle]',
  standalone: true,
  host: { class: 'dialog__title' }
})
export class DialogTitleDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly context = inject(DialogContext);
  private identifier: string | null = null;

  ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    const existingId = element.id || this.context.createId('dialog-title');
    element.id = existingId;
    this.identifier = existingId;
    this.context.setTitleId(existingId);
  }

  ngOnDestroy(): void {
    if (this.identifier !== null) {
      this.context.setTitleId(null);
    }
  }
}
