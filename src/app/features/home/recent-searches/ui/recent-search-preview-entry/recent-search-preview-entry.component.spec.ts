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
    lineCode: 'M-301',
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

  it('lays out line badge, wait label and time without arrows, in reading order', async () => {
    await create(buildEntry());

    expect(fixture.debugElement.query(By.css('.recent-preview-entry__arrow'))).toBeNull();

    const root: HTMLElement = fixture.debugElement.query(By.css('.recent-preview-entry'))
      .nativeElement;
    const classes = Array.from(root.children).map((child) =>
      Array.from(child.classList).find((token) => token.startsWith('recent-preview-entry__'))
    );
    const order = classes.filter(Boolean);
    expect(order.indexOf('recent-preview-entry__line')).toBeLessThan(
      order.indexOf('recent-preview-entry__wait')
    );
    expect(order.indexOf('recent-preview-entry__wait')).toBeLessThan(
      order.indexOf('recent-preview-entry__time')
    );

    expect(text('.recent-preview-entry__line')).toBe('M-301');
    expect(text('.recent-preview-entry__wait')).toBe('En 1h');
    expect(text('.recent-preview-entry__time')).toBe('14:26');
  });

  it('marks previous departures with the wait label only, keeping the grid structure', async () => {
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

    const wait = fixture.debugElement.query(By.css('.recent-preview-entry__wait'));
    expect(wait.nativeElement.textContent.trim()).toBe('Hace 5m');
    expect(wait.nativeElement.classList).toContain('recent-preview-entry__wait--previous');
    expect(wait.nativeElement.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.debugElement.query(By.css('.recent-preview-entry__arrow'))).toBeNull();
    expect(text('.recent-preview-entry__time')).toBe('14:26');
  });

  it('keeps the spoken full-unit equivalent in a visually hidden node', async () => {
    await create(buildEntry());

    const hidden = fixture.debugElement.query(By.css('.recent-preview-entry__spoken'));
    expect(hidden.nativeElement.textContent.trim()).toBe('En 1 hora');
  });

  it('omits the wait row when no relative label is available', async () => {
    await create(buildEntry({ relativeLabel: null }));

    expect(fixture.debugElement.query(By.css('.recent-preview-entry__wait'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.recent-preview-entry__spoken'))).toBeNull();
    expect(text('.recent-preview-entry__time')).toBe('14:26');
  });
});
