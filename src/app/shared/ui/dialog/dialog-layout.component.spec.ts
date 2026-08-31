import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { DialogLayoutComponent } from '@shared/ui/dialog/dialog-layout.component';
import {
  OVERLAY_DIALOG_ARIA_ADAPTER,
  OverlayDialogAriaAdapter
} from '@shared/ui/dialog/overlay-dialog-container.component';

class EmptyTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class OverlayDialogAriaAdapterStub implements OverlayDialogAriaAdapter {
  labelledBy: string | null = null;
  describedBy: string | null = null;

  setLabelledBy(value: string): void {
    this.labelledBy = value;
  }

  setDescribedBy(value: string | null): void {
    this.describedBy = value;
  }
}

describe('DialogLayoutComponent', () => {
  let fixture: ComponentFixture<DialogLayoutComponent>;
  let component: DialogLayoutComponent;
  let adapter: OverlayDialogAriaAdapterStub;

  beforeEach(() => {
    adapter = new OverlayDialogAriaAdapterStub();

    TestBed.configureTestingModule({
      imports: [
        DialogLayoutComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyTranslateLoader }
        })
      ],
      providers: [
        { provide: OVERLAY_DIALOG_ARIA_ADAPTER, useValue: adapter }
      ]
    });

    fixture = TestBed.createComponent(DialogLayoutComponent);
    component = fixture.componentInstance;
  });

  it('should register the dialog title with the aria adapter', () => {
    component.titleKey = 'dialog.title';
    fixture.detectChanges();

    const internal = component as unknown as { titleId: string };

    expect(adapter.labelledBy).toBe(internal.titleId);
  });

  it('should register and clear the dialog description when the input changes', () => {
    component.titleKey = 'dialog.title';
    component.descriptionKey = 'dialog.description';
    fixture.detectChanges();

    const internal = component as unknown as { descriptionId: string | null };

    expect(adapter.describedBy).toBe(internal.descriptionId);

    component.descriptionKey = null;
    fixture.detectChanges();

    expect(adapter.describedBy).toBeNull();
  });
});
