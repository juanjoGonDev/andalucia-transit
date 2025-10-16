import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

import { DialogContext } from './dialog-context';

@Directive({
  selector: '[appDialogDescription],[uiDialogDescription]',
  standalone: true,
  host: { class: 'dialog__description' }
})
export class DialogDescriptionDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly context = inject(DialogContext);
  private identifier: string | null = null;

  ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    const existingId = element.id || this.context.createId('dialog-description');
    element.id = existingId;
    this.identifier = existingId;
    this.context.setDescriptionId(existingId);
  }

  ngOnDestroy(): void {
    if (this.identifier !== null) {
      this.context.setDescriptionId(null);
    }
  }
}
