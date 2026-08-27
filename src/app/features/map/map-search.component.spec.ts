import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { MapSearchComponent } from '@features/map/map-search.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

describe('MapSearchComponent', () => {
  let fixture: ComponentFixture<MapSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MapSearchComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapSearchComponent);
    fixture.detectChanges();
  });

  it('starts icon-first without rendering the search field', () => {
    expect(fixture.nativeElement.querySelector('.map-search__trigger')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-autocomplete')).toBeNull();
  });

  it('expands and focuses the search input after activation', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('.map-search__trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    flushMicrotasks();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement | null;

    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  }));

  it('collapses on Escape and restores focus to the trigger', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('.map-search__trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    flushMicrotasks();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    flushMicrotasks();

    expect(fixture.nativeElement.querySelector('app-autocomplete')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  }));
});
