import { OverlayRef } from '@angular/cdk/overlay';
import { Observable, Subject } from 'rxjs';

export class DialogRef<TResult = unknown> {
  private readonly afterClosedSubject = new Subject<TResult | undefined>();
  private closed = false;
  private resultValue: TResult | undefined;

  constructor(private readonly overlayRef: OverlayRef) {
    this.overlayRef.detachments().subscribe(() => {
      this.finish(this.resultValue);
    });
  }

  close(result?: TResult): void {
    this.resultValue = result;
    this.overlayRef.dispose();
    this.finish(result);
  }

  afterClosed(): Observable<TResult | undefined> {
    return this.afterClosedSubject.asObservable();
  }

  backdropClicks(): Observable<MouseEvent> {
    return this.overlayRef.backdropClick();
  }

  keydownEvents(): Observable<KeyboardEvent> {
    return this.overlayRef.keydownEvents();
  }

  private finish(result?: TResult): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.afterClosedSubject.next(result);
    this.afterClosedSubject.complete();
  }
}
