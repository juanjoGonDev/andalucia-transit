import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppShellTopActionsComponent } from '@shared/layout/top-actions/app-shell-top-actions.component';
import { LINE_DETAIL_BASE_SEGMENT } from '@shared/navigation/navigation.util';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'navigation.home': 'Home',
      'navigation.lines': 'Lines',
      'navigation.map': 'Map',
      'navigation.favorites': 'Favorites',
      'home.topBar.menuLabel': 'Open feature menu',
      'home.menu.recent': 'Recent searches',
      'home.menu.settings': 'Settings',
      'home.menu.news': 'News'
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

    await firstValueFrom(TestBed.inject(TranslateService).use('en'));
    layoutContextStore = TestBed.inject(AppLayoutContextStore);
    fixture = TestBed.createComponent(AppShellTopActionsComponent);
    fixture.detectChanges();
  });

  it('exposes the four primary transit destinations before More', () => {
    const links = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.shell-actions__button--quick'
      ) as NodeListOf<HTMLAnchorElement>
    );
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement | null;

    expect(links.length).toBe(4);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/lines',
      '/map',
      '/favorites'
    ]);
    expect(links.every((link) => Boolean(link.getAttribute('aria-label')))).toBeTrue();
    expect(menu?.tagName).toBe('BUTTON');
    expect(menu?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.getAttribute('aria-controls')).toBe('shell-actions-overflow');
  });

  it('marks the Lines directory as the current primary destination', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('lines'),
      navigationKey: LINE_DETAIL_BASE_SEGMENT,
      surface: 'hero'
    });
    fixture.detectChanges();

    const lines = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/lines"]'
    ) as HTMLAnchorElement | null;
    const home = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/"]'
    ) as HTMLAnchorElement | null;

    expect(lines?.getAttribute('aria-current')).toBe('page');
    expect(lines?.classList.contains('shell-actions__button--active')).toBeTrue();
    expect(home?.getAttribute('aria-current')).toBeNull();
  });

  it('maps both favorite routes to the persistent Favorites destination', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('home-favorites'),
      navigationKey: APP_CONFIG.routes.homeFavorites,
      surface: 'hero'
    });
    fixture.detectChanges();

    const favorites = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/favorites"]'
    ) as HTMLAnchorElement | null;

    expect(favorites?.getAttribute('aria-current')).toBe('page');
  });

  it('keeps secondary navigation hidden until More is activated', () => {
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;

    expect(fixture.nativeElement.querySelector('#shell-actions-overflow')).toBeNull();

    menu.click();
    fixture.detectChanges();

    const overflow = fixture.nativeElement.querySelector('#shell-actions-overflow') as HTMLElement | null;
    const entries = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.shell-actions__menu-button'
      ) as NodeListOf<HTMLAnchorElement>
    );

    expect(overflow).not.toBeNull();
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual([
      '/recents',
      '/news',
      '/settings'
    ]);
  });

  it('closes the upward overflow with Escape and restores focus to More', fakeAsync(() => {
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;

    menu.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    flushMicrotasks();

    expect(fixture.nativeElement.querySelector('#shell-actions-overflow')).toBeNull();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
  }));

  it('closes the overflow when a secondary destination is selected', () => {
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;

    menu.click();
    fixture.detectChanges();

    const settings = fixture.nativeElement.querySelector(
      '.shell-actions__menu-button[href="/settings"]'
    ) as HTMLAnchorElement;
    settings.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#shell-actions-overflow')).toBeNull();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the active secondary destination inside the overflow', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('settings'),
      navigationKey: APP_CONFIG.routes.settings,
      surface: 'hero'
    });
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;
    menu.click();
    fixture.detectChanges();

    const settings = fixture.nativeElement.querySelector(
      '.shell-actions__menu-button[href="/settings"]'
    ) as HTMLAnchorElement | null;

    expect(settings?.getAttribute('aria-current')).toBe('page');
    expect(menu.classList.contains('shell-actions__button--active')).toBeTrue();
  });
});
