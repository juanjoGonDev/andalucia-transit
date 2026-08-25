import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppShellTopActionsComponent } from '@shared/layout/top-actions/app-shell-top-actions.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'navigation.home': 'Home',
      'home.topBar.mapLabel': 'Open interactive map',
      'home.topBar.menuLabel': 'Open sections menu',
      'home.menu.recent': 'Recent searches',
      'home.menu.favorites': 'Favorite stops',
      'home.menu.settings': 'Settings',
      'home.menu.news': 'News',
      'home.menu.inProgress': 'In progress'
    });
  }
}

describe('AppShellTopActionsComponent', () => {
  let fixture: ComponentFixture<AppShellTopActionsComponent>;
  let layoutContextStore: AppLayoutContextStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AppShellTopActionsComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [AppLayoutContextStore]
    }).compileComponents();

    layoutContextStore = TestBed.inject(AppLayoutContextStore);
    fixture = TestBed.createComponent(AppShellTopActionsComponent);
    fixture.detectChanges();
  });

  it('renders Home and Map as persistent quick links before the menu', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.shell-actions__button') as NodeListOf<HTMLElement>
    );
    const home = buttons[0] as HTMLAnchorElement | undefined;
    const map = buttons[1] as HTMLAnchorElement | undefined;
    const menu = buttons[2];

    expect(buttons.length).toBe(3);
    expect(home?.tagName).toBe('A');
    expect(home?.getAttribute('href')).toBe('/');
    expect(home?.getAttribute('aria-label')).toBeTruthy();
    expect(map?.tagName).toBe('A');
    expect(map?.getAttribute('href')).toBe('/map');
    expect(map?.getAttribute('aria-label')).toBeTruthy();
    expect(menu?.classList.contains('shell-actions__button--menu')).toBeTrue();
  });

  it('marks Map as the current quick destination', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('map'),
      navigationKey: APP_CONFIG.routes.map
    });
    fixture.detectChanges();

    const home = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick:first-of-type'
    ) as HTMLAnchorElement | null;
    const map = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/map"]'
    ) as HTMLAnchorElement | null;

    expect(home?.getAttribute('aria-current')).toBeNull();
    expect(map?.getAttribute('aria-current')).toBe('page');
    expect(map?.classList.contains('shell-actions__button--active')).toBeTrue();
  });

  it('keeps the Home quick destination active for Home subviews', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('home-recent'),
      navigationKey: APP_CONFIG.routes.homeRecent
    });
    fixture.detectChanges();

    const home = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/"]'
    ) as HTMLAnchorElement | null;
    const map = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/map"]'
    ) as HTMLAnchorElement | null;

    expect(home?.getAttribute('aria-current')).toBe('page');
    expect(home?.classList.contains('shell-actions__button--active')).toBeTrue();
    expect(map?.getAttribute('aria-current')).toBeNull();
  });
});
