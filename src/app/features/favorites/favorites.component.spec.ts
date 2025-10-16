import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ComponentType } from '@angular/cdk/portal';

import { FavoritesComponent } from './favorites.component';
import { StopFavorite, StopFavoritesService } from '../../domain/stops/stop-favorites.service';
import { ConfirmDialogData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { APP_CONFIG } from '../../core/config';
import { DialogService } from '../../shared/ui/dialog/dialog.service';
import { DialogConfig } from '../../shared/ui/dialog/dialog.config';
import { DialogRef } from '../../shared/ui/dialog/dialog-ref';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class StopFavoritesServiceStub {
  private readonly subject = new BehaviorSubject<readonly StopFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly remove = jasmine.createSpy('remove');
  readonly clear = jasmine.createSpy('clear');

  emit(favorites: readonly StopFavorite[]): void {
    this.subject.next(favorites);
  }
}

class DialogServiceStub {
  private response$: Observable<boolean | undefined> = of(true);
  private lastConfig: DialogConfig<ConfirmDialogData> | undefined;

  readonly open = jasmine
    .createSpy('open')
    .and.callFake(<TComponent>(_: ComponentType<TComponent>, config?: DialogConfig<ConfirmDialogData>) => {
      this.lastConfig = config;
      const ref: Partial<DialogRef<boolean>> = {
        afterClosed: () => this.response$
      };
      return ref as DialogRef<boolean>;
    });

  setResponse(value: boolean): void {
    this.response$ = of(value);
  }

  lastData(): ConfirmDialogData | undefined {
    return this.lastConfig?.data;
  }
}

class RouterStub {
  readonly navigate = jasmine.createSpy('navigate').and.resolveTo(true);
}

interface FavoritesComponentAccess {
  searchControl: FavoritesComponent['searchControl'];
  openStop: FavoritesComponent['openStop'];
  remove: FavoritesComponent['remove'];
  clearAll: FavoritesComponent['clearAll'];
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
  let favoritesService: StopFavoritesServiceStub;
  let dialog: DialogServiceStub;
  let router: RouterStub;

  beforeEach(async () => {
    favoritesService = new StopFavoritesServiceStub();
    dialog = new DialogServiceStub();
    router = new RouterStub();

    await TestBed.configureTestingModule({
      imports: [
        FavoritesComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: StopFavoritesService, useValue: favoritesService },
        { provide: DialogService, useValue: dialog },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesComponent);
    component = fixture.componentInstance;
  });

  it('renders favorites grouped by municipality', () => {
    favoritesService.emit(FAVORITES);
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
    favoritesService.emit(FAVORITES);
    fixture.detectChanges();

    const access = accessProtected(component);
    access.searchControl.setValue('triana');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.favorites__item') as NodeListOf<HTMLLIElement>;
    expect(items.length).toBe(1);
    expect(items[0]?.textContent).toContain('Triana');
  });

  it('navigates to stop detail when selecting a favorite', async () => {
    const favorite = FAVORITES[0];
    const access = accessProtected(component);
    await access.openStop.call(component, toListItem(favorite));

    expect(router.navigate).toHaveBeenCalledWith([
      '/',
      APP_CONFIG.routes.stopDetailBase,
      'sevilla:001'
    ]);
  });

  it('removes a favorite after confirmation', async () => {
    const favorite = FAVORITES[0];
    dialog.setResponse(true);

    const access = accessProtected(component);
    await access.remove.call(component, toListItem(favorite));

    expect(favoritesService.remove).toHaveBeenCalledWith('sevilla-001');
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

    expect(favoritesService.remove).not.toHaveBeenCalled();
  });

  it('clears all favorites after confirmation', async () => {
    favoritesService.emit(FAVORITES);
    fixture.detectChanges();
    dialog.setResponse(true);

    const access = accessProtected(component);
    await access.clearAll.call(component);

    expect(favoritesService.clear).toHaveBeenCalled();
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

    expect(favoritesService.clear).not.toHaveBeenCalled();
  });
});
