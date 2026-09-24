import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { RecentSearchCardComponent } from './recent-search-card.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'recent.previewLoading': 'Loading',
      'removeAction': 'Remove'
    });
  }
}

describe('RecentSearchCardComponent', () => {
  let fixture: ComponentFixture<RecentSearchCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RecentSearchCardComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(RecentSearchCardComponent);
    fixture.componentRef.setInput('originName', 'North Station');
    fixture.componentRef.setInput('destinationName', 'South Station');
    fixture.componentRef.setInput('searchDateLabel', '21/09/2026');
    fixture.componentRef.setInput('loadingKey', 'recent.previewLoading');
    fixture.componentRef.setInput('errorKey', 'recent.previewError');
    fixture.componentRef.setInput('noPreviewKey', 'recent.noPreview');
    fixture.componentRef.setInput('previewDisabledKey', 'recent.previewDisabled');
    fixture.componentRef.setInput('removeActionKey', 'removeAction');
    fixture.componentRef.setInput('preview', { status: 'disabled' });
    fixture.detectChanges();
  });

  it('renders the short numeric search date without any wording around it', () => {
    const date = fixture.debugElement.query(By.css('.recent-search-card__date'));

    expect(date.nativeElement.textContent.trim()).toBe('21/09/2026');
  });

  it('does not render the redundant "updated to today" notice', () => {
    const notice = fixture.debugElement.query(By.css('.recent-search-card__today'));

    expect(notice).toBeNull();
  });
});
