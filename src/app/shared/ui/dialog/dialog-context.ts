import { BehaviorSubject, Observable } from 'rxjs';

export class DialogContext {
  private static idCounter = 0;

  private readonly titleIdSubject = new BehaviorSubject<string | null>(null);
  private readonly descriptionIdSubject = new BehaviorSubject<string | null>(null);
  private readonly footerPresentSubject = new BehaviorSubject<boolean>(false);
  private footerCount = 0;

  readonly titleId$: Observable<string | null> = this.titleIdSubject.asObservable();
  readonly descriptionId$: Observable<string | null> = this.descriptionIdSubject.asObservable();
  readonly hasFooter$: Observable<boolean> = this.footerPresentSubject.asObservable();

  createId(prefix: string): string {
    DialogContext.idCounter += 1;
    return `${prefix}-${DialogContext.idCounter}`;
  }

  setTitleId(id: string | null): void {
    this.titleIdSubject.next(id);
  }

  setDescriptionId(id: string | null): void {
    this.descriptionIdSubject.next(id);
  }

  addFooter(): void {
    this.footerCount += 1;
    if (this.footerCount > 0) {
      this.footerPresentSubject.next(true);
    }
  }

  removeFooter(): void {
    this.footerCount = Math.max(0, this.footerCount - 1);
    if (this.footerCount === 0) {
      this.footerPresentSubject.next(false);
    }
  }
}
