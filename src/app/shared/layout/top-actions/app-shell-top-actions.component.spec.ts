import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppShellTopActionsComponent } from '@shared/layout/top-actions/app-shell-top-actions.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'navigation.home': 'Home',
      'navigation.routeSearch': 'Route search',
      'navigation.map': 'Map',
      'navigation.favorites': 'Favorites',
      'home.topBar.menuLabel': 'Open feature menu',
      'home.menu.recent': 'Recent searches',
      'home.menu.settings': 'Settings',
      'home.menu.news': 'News',
      'home.dialogs.nearbyStops.close': 'Close',
      'map.routes.title': 'Routes'
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
      '/routes',
      '/map',
      '/favorites'
    ]);
    expect(links.every((link) => Boolean(link.getAttribute('aria-label')))).toBeTrue();
    expect(links.every((link) => Boolean(link.textContent?.trim()))).toBeTrue();
    expect(menu?.tagName).toBe('BUTTON');
    expect(menu?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(menu?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.getAttribute('aria-controls')).toBe('shell-actions-drawer');
  });

  it('marks route search as the current primary destination', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('routes'),
      navigationKey: APP_CONFIG.routes.routeSearch
    });
    fixture.detectChanges();

    const routeSearch = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/routes"]'
    ) as HTMLAnchorElement | null;
    const home = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/"]'
    ) as HTMLAnchorElement | null;

    expect(routeSearch?.getAttribute('aria-current')).toBe('page');
    expect(routeSearch?.classList.contains('shell-actions__button--active')).toBeTrue();
    expect(home?.getAttribute('aria-current')).toBeNull();
  });

  it('maps both favorite routes to the persistent Favorites destination', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('home-favorites'),
      navigationKey: APP_CONFIG.routes.homeFavorites
    });
    fixture.detectChanges();

    const favorites = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/favorites"]'
    ) as HTMLAnchorElement | null;
    const home = fixture.nativeElement.querySelector(
      '.shell-actions__button--quick[href="/"]'
    ) as HTMLAnchorElement | null;

    expect(favorites?.getAttribute('aria-current')).toBe('page');
    expect(home?.getAttribute('aria-current')).toBeNull();
  });

  it('opens a modal navigation drawer with only secondary destinations', () => {
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector(
      '.shell-actions__drawer'
    ) as HTMLDialogElement;

    menu.click();
    fixture.detectChanges();

    const entries = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.shell-actions__menu-button'
      ) as NodeListOf<HTMLAnchorElement>
    );

    expect(dialog.open).toBeTrue();
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('shell-actions-drawer-title');
    expect(dialog.querySelector('[role="menu"]')).toBeNull();
    expect(dialog.querySelector('[role="menuitem"]')).toBeNull();
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual([
      '/recents',
      '/news',
      '/settings'
    ]);
    expect(entries.map((entry) => entry.textContent?.trim())).toEqual([
      'Recent searches',
      'News',
      'Settings'
    ]);
    expect(document.activeElement?.classList.contains('shell-actions__drawer-close')).toBeTrue();
  });

  it('restores focus to More when the drawer closes', () => {
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector(
      '.shell-actions__drawer'
    ) as HTMLDialogElement;

    menu.click();
    fixture.detectChanges();

    const close = fixture.nativeElement.querySelector(
      '.shell-actions__drawer-close'
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();

    expect(dialog.open).toBeFalse();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
  });

  it('dismisses the drawer from the backdrop surface', () => {
    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector(
      '.shell-actions__drawer'
    ) as HTMLDialogElement;

    menu.click();
    fixture.detectChanges();
    dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(menu);
  });

  it('syncs native dialog dismissal and the active secondary destination', () => {
    layoutContextStore.registerContent({
      identifier: Symbol('settings'),
      navigationKey: APP_CONFIG.routes.settings
    });
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector(
      '.shell-actions__button--menu'
    ) as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector(
      '.shell-actions__drawer'
    ) as HTMLDialogElement;

    menu.click();
    fixture.detectChanges();

    const settings = fixture.nativeElement.querySelector(
      '.shell-actions__menu-button[href="/settings"]'
    ) as HTMLAnchorElement | null;
    expect(settings?.getAttribute('aria-current')).toBe('page');

    dialog.close();
    fixture.detectChanges();

    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
  });
});
