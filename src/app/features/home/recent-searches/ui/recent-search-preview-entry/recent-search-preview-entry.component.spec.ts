import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { of } from 'rxjs';
import { RecentSearchPreviewEntry } from '@features/home/recent-searches/recent-searches.models';
import { RecentSearchPreviewEntryComponent } from './recent-search-preview-entry.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'routeSearch.upcomingLabel': 'En {time}',
      'routeSearch.pastLabel': 'Hace {time}',
      'countdown.hour': '{value, plural, one {# hora} other {# horas}}',
      'countdown.minute': '{value, plural, one {# minuto} other {# minutos}}',
      'countdown.second': '{value, plural, one {# segundo} other {# segundos}}'
    });
  }
}

function buildEntry(overrides: Partial<RecentSearchPreviewEntry> = {}): RecentSearchPreviewEntry {
  return {
    id: 'entry-1',
    kind: 'next',
    lineCode: '001',
    departureTime: new Date('2026-09-21T14:26:00'),
    relativeLabel: {
      key: 'routeSearch.upcomingLabel',
      text: '1h',
      spoken: { value: 1, unit: 'hour' }
    },
    ...overrides
  };
}

describe('RecentSearchPreviewEntryComponent', () => {
  let fixture: ComponentFixture<RecentSearchPreviewEntryComponent>;

  async function create(entry: RecentSearchPreviewEntry): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        RecentSearchPreviewEntryComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('es');
    translate.use('es');

    fixture = TestBed.createComponent(RecentSearchPreviewEntryComponent);
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  const text = (selector: string): string => {
    const node = fixture.debugElement.query(By.css(selector));
    return node?.nativeElement.textContent.trim() ?? '';
  };

  it('renders an aria-hidden down arrow chip and time for the next departure', async () => {
    await create(buildEntry());

    const arrow = fixture.debugElement.query(By.css('.recent-preview-entry__arrow'));
    expect(arrow.nativeElement.textContent.trim()).toBe('↓');
    expect(arrow.nativeElement.getAttribute('aria-hidden')).toBe('true');
    expect(arrow.nativeElement.classList).toContain('recent-preview-entry__arrow--next');
    expect(text('.recent-preview-entry__time')).toBe('14:26');
  });

  it('renders a red aria-hidden up arrow for previous departures', async () => {
    await create(
      buildEntry({
        kind: 'previous',
        relativeLabel: {
          key: 'routeSearch.pastLabel',
          text: '5m',
          spoken: { value: 5, unit: 'minute' }
        }
      })
    );

    const arrow = fixture.debugElement.query(By.css('.recent-preview-entry__arrow'));
    expect(arrow.nativeElement.textContent.trim()).toBe('↑');
    expect(arrow.nativeElement.classList).toContain('recent-preview-entry__arrow--previous');
    expect(text('.recent-preview-entry__time')).toBe('14:26');
  });

  it('shows the compact countdown and a spoken full-unit equivalent', async () => {
    await create(buildEntry());

    const visual = fixture.debugElement.query(By.css('.recent-preview-entry__relative'));
    expect(visual.nativeElement.textContent.trim()).toBe('En 1h');
    expect(visual.nativeElement.getAttribute('aria-hidden')).toBe('true');

    const hidden = fixture.debugElement.query(By.css('.recent-preview-entry__spoken'));
    expect(hidden.nativeElement.textContent.trim()).toBe('En 1 hora');
  });

  it('omits the countdown row when no relative label is available', async () => {
    await create(buildEntry({ relativeLabel: null }));

    expect(fixture.debugElement.query(By.css('.recent-preview-entry__relative'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.recent-preview-entry__spoken'))).toBeNull();
  });
});
