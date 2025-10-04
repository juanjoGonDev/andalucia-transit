import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { formatDate, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { APP_CONFIG } from '../../core/config';
import { CardListItemComponent } from '../../shared/ui/card-list-item/card-list-item.component';
import { HomeComponent } from './home.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  const dialogStub = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    dialogStub.open.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: dialogStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('initializes the date field with today and enforces the minimum date attribute', async () => {
    const expectedToday = formatDate(
      new Date(),
      APP_CONFIG.formats.isoDate,
      APP_CONFIG.locales.default
    );

    await fixture.whenStable();

    const dateInput = fixture.debugElement.query(
      By.css(`#${APP_CONFIG.homeData.search.dateFieldId}`)
    ).nativeElement as HTMLInputElement;

    expect(dateInput.value).toBe(expectedToday);
    expect(dateInput.min).toBe(expectedToday);
  });

  it('prevents searching with a date earlier than today', async () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const form = component['searchForm'];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayValue = formatDate(
      yesterday,
      APP_CONFIG.formats.isoDate,
      APP_CONFIG.locales.default
    );

    form.setValue({
      origin: 'Origin stop',
      destination: 'Destination stop',
      date: yesterdayValue
    });
    form.updateValueAndValidity();

    component['onSearch']();

    expect(form.invalid).toBeTrue();
    expect(form.get('date')?.hasError('minDate')).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('renders the configured recent stops with a scrollable list', () => {
    const expectedStops = APP_CONFIG.homeData.recentStops.items.slice(
      0,
      APP_CONFIG.homeData.recentStops.maxItems
    );

    const recentList = fixture.debugElement.query(By.css('.home__recent-list'));
    const recentItems = recentList.queryAll(By.directive(CardListItemComponent));

    expect(recentItems.length).toBe(expectedStops.length);
    expect(recentList.nativeElement.classList.contains('home__list--scroll')).toBeTrue();

    for (const item of recentItems) {
      const instance = item.componentInstance as CardListItemComponent;
      expect(instance.leadingIcon).toBe(APP_CONFIG.homeData.recentStops.icon);
    }
  });
});
