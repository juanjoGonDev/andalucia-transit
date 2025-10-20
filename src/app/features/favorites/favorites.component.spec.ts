import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { OverlayDialogConfig, OverlayDialogRef, OverlayDialogService } from '../../shared/ui/dialog/overlay-dialog.service';
import { FavoritesComponent } from './favorites.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { APP_CONFIG } from '../../core/config';
import { FavoritesFacade, StopFavorite } from '../../domain/stops/favorites.facade';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class FavoritesFacadeStub {
  private readonly subject = new BehaviorSubject<readonly StopFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly remove = jasmine.createSpy('remove');
  readonly clear = jasmine.createSpy('clear');
  readonly add = jasmine.createSpy('add');
  readonly toggle = jasmine.createSpy('toggle');
  readonly isFavorite = jasmine.createSpy('isFavorite');

  emit(favorites: readonly StopFavorite[]): void {
    this.subject.next(favorites);
  }
}

class OverlayDialogServiceStub {
  private response$: Observable<boolean | undefined> = of(true);
  private lastConfig: OverlayDialogConfig<ConfirmDialogData> | undefined;

  readonly open = jasmine
    .createSpy('open')
    .and.callFake((_: typeof ConfirmDialogComponent, config?: OverlayDialogConfig<ConfirmDialogData>) => {
      this.lastConfig = config;
      const ref: OverlayDialogRef<boolean> = {
        afterClosed: () => this.response$,
        close: () => undefined
      };
      return ref;
    });

  setResponse(value: boolean): void {
    this.response$ = of(value);
  }

  lastData(): ConfirmDialogData | undefined {
    return this.lastConfig?.data;
  }
}

interface FavoritesComponentAccess {
  searchControl: FavoritesComponent['searchControl'];
  remove: FavoritesComponent['remove'];
  clearAll: FavoritesComponent['clearAll'];
  stopDetailCommands: FavoritesComponent['stopDetailCommands'];
}

const accessProtected = (instance: FavoritesComponent): FavoritesComponentAccess =>
  instance as unknown as FavoritesComponentAccess;

type FavoriteListItemInput = Parameters<FavoritesComponent['remove']>[0];

const toListItem = (favorite: StopFavorite): FavoriteListItemInput => ({
  id: favorite.id,
  name: favorite.name,
  code: favorite.code,
  municipality: favorite.municipality,
  nucleus: favorite.nucleus,
  stopIds: favorite.stopIds
});

const FAVORITES: readonly StopFavorite[] = [
  {
    id: 'sevilla-001',
    code: '001',
    name: 'Alameda',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Centro',
    nucleusId: 'centro',
    consortiumId: 7,
    stopIds: ['sevilla:001']
  },
  {
    id: 'granada-101',
    code: '101',
    name: 'Granada Centro',
    municipality: 'Granada',
    municipalityId: 'granada',
    nucleus: 'Centro',
    nucleusId: 'granada-centro',
    consortiumId: 4,
    stopIds: ['granada:101']
  },
  {
    id: 'sevilla-010',
    code: '010',
    name: 'Triana',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Triana',
    nucleusId: 'triana',
    consortiumId: 7,
    stopIds: ['sevilla:010']
  }
] as const;

describe('FavoritesComponent', () => {
  let fixture: ComponentFixture<FavoritesComponent>;
  let component: FavoritesComponent;
  let favoritesFacade: FavoritesFacadeStub;
  let dialog: OverlayDialogServiceStub;
  let router: Router;
  let navigateSpy: jasmine.Spy<Router['navigate']>;

  beforeEach(async () => {
    favoritesFacade = new FavoritesFacadeStub();
    dialog = new OverlayDialogServiceStub();
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        FavoritesComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: FavoritesFacade, useValue: favoritesFacade },
        { provide: OverlayDialogService, useValue: dialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('renders favorites grouped by municipality', () => {
    favoritesFacade.emit(FAVORITES);
    fixture.detectChanges();

    const titleElements = fixture.nativeElement.querySelectorAll('.favorites__group-title') as NodeListOf<HTMLElement>;
    const titles = Array.from(titleElements).map((title) => title.textContent?.trim());

    expect(titles).toEqual(['Granada', 'Sevilla']);

    const firstGroupItems = fixture.nativeElement.querySelectorAll(
      '.favorites__group:first-of-type .favorites__item'
    ) as NodeListOf<HTMLLIElement>;
    const secondGroupItems = fixture.nativeElement.querySelectorAll(
      '.favorites__group:last-of-type .favorites__item'
    ) as NodeListOf<HTMLLIElement>;

    expect(firstGroupItems.length).toBe(1);
    expect(secondGroupItems.length).toBe(2);
  });

  it('filters favorites by search term', () => {
    favoritesFacade.emit(FAVORITES);
    fixture.detectChanges();

    const access = accessProtected(component);
    access.searchControl.setValue('triana');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.favorites__item') as NodeListOf<HTMLLIElement>;
    expect(items.length).toBe(1);
    expect(items[0]?.textContent).toContain('Triana');
  });

  it('provides router commands to open stop detail', () => {
    const favorite = FAVORITES[0];
    const access = accessProtected(component);
    const commands = access.stopDetailCommands.call(component, toListItem(favorite));

    expect(commands).toEqual(['/', APP_CONFIG.routes.stopDetailBase, 'sevilla:001']);
  });

  it('removes a favorite after confirmation', async () => {
    const favorite = FAVORITES[0];
    dialog.setResponse(true);

    const access = accessProtected(component);
    await access.remove.call(component, toListItem(favorite));

    expect(favoritesFacade.remove).toHaveBeenCalledWith('sevilla-001');
    expect(dialog.lastData()).toEqual(
      jasmine.objectContaining({
        details: jasmine.arrayContaining([
          jasmine.objectContaining({ value: favorite.name }),
          jasmine.objectContaining({ value: favorite.code })
        ])
      })
    );
  });

  it('does not remove a favorite when confirmation is rejected', async () => {
    const favorite = FAVORITES[0];
    dialog.setResponse(false);

    const access = accessProtected(component);
    await access.remove.call(component, toListItem(favorite));

    expect(favoritesFacade.remove).not.toHaveBeenCalled();
  });

  it('clears all favorites after confirmation', async () => {
    favoritesFacade.emit(FAVORITES);
    fixture.detectChanges();
    dialog.setResponse(true);

    const access = accessProtected(component);
    await access.clearAll.call(component);

    expect(favoritesFacade.clear).toHaveBeenCalled();
    expect(dialog.lastData()).toEqual(
      jasmine.objectContaining({
        details: jasmine.arrayContaining([
          jasmine.objectContaining({ value: FAVORITES.length.toString() })
        ])
      })
    );
  });

  it('does not clear favorites when confirmation is rejected', async () => {
    dialog.setResponse(false);

    const access = accessProtected(component);
    await access.clearAll.call(component);

    expect(favoritesFacade.clear).not.toHaveBeenCalled();
  });
});
