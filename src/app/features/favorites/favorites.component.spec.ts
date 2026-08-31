import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import {
  FavoriteCollectionFacade,
  FavoriteCollectionSnapshot
} from '@domain/favorites/favorite-collection.facade';
import { LineFavorite } from '@domain/lines/line-favorites.facade';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';
import {
  StopDirectoryFacade,
  StopDirectoryOption
} from '@domain/stops/stop-directory.facade';
import { FavoritesComponent } from '@features/favorites/favorites.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/ui/confirm-dialog/confirm-dialog.component';
import {
  OverlayDialogConfig,
  OverlayDialogRef,
  OverlayDialogService
} from '@shared/ui/dialog/overlay-dialog.service';

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

class FavoriteCollectionFacadeStub {
  private readonly subject = new BehaviorSubject<FavoriteCollectionSnapshot>({
    stops: [],
    lines: [],
    total: 0
  });
  readonly favorites$ = this.subject.asObservable();
  readonly removeStop = jasmine.createSpy('removeStop');
  readonly removeLine = jasmine.createSpy('removeLine');
  readonly clear = jasmine.createSpy('clear');

  emit(stops: readonly StopFavorite[], lines: readonly LineFavorite[]): void {
    this.subject.next({ stops, lines, total: stops.length + lines.length });
  }
}

class StopDirectoryFacadeStub {
  readonly searchStops = jasmine.createSpy('searchStops').and.returnValue(of([]));
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
  removeStop: FavoritesComponent['removeStop'];
  removeLine: FavoritesComponent['removeLine'];
  clearAll: FavoritesComponent['clearAll'];
  toggleAddMode: FavoritesComponent['toggleAddMode'];
  stopDetailCommands: FavoritesComponent['stopDetailCommands'];
  stopDetailQueryParams: FavoritesComponent['stopDetailQueryParams'];
  lineDetailCommands: FavoritesComponent['lineDetailCommands'];
}

const accessProtected = (instance: FavoritesComponent): FavoritesComponentAccess =>
  instance as unknown as FavoritesComponentAccess;

type FavoriteStopListItemInput = Parameters<FavoritesComponent['removeStop']>[0];

const toStopListItem = (favorite: StopFavorite): FavoriteStopListItemInput => ({
  id: favorite.id,
  name: favorite.name,
  code: favorite.code,
  municipality: favorite.municipality,
  nucleus: favorite.nucleus,
  consortiumId: favorite.consortiumId,
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

const LINE_FAVORITES: readonly LineFavorite[] = [
  {
    id: '6|100',
    consortiumId: 6,
    lineId: '100',
    code: 'M-100',
    name: 'Circular Huércal de Almería',
    mode: 'Autobús'
  },
  {
    id: '7|200',
    consortiumId: 7,
    lineId: '200',
    code: 'M-200',
    name: 'Sevilla - Dos Hermanas',
    mode: 'Autobús'
  }
] as const;

const DIRECTORY_OPTION: StopDirectoryOption = {
  id: '6:2125',
  code: '2125',
  name: 'Ada Byron IES (Universidad)',
  municipality: 'Málaga',
  municipalityId: 'malaga',
  nucleus: '',
  nucleusId: 'missing',
  consortiumId: 6,
  stopIds: ['2125']
};

const languageService = {
  currentLanguage: signal<'es' | 'en'>('es').asReadonly()
};

describe('FavoritesComponent', () => {
  let fixture: ComponentFixture<FavoritesComponent>;
  let component: FavoritesComponent;
  let favoritesFacade: FavoritesFacadeStub;
  let favoriteCollection: FavoriteCollectionFacadeStub;
  let stopDirectory: StopDirectoryFacadeStub;
  let dialog: OverlayDialogServiceStub;

  beforeEach(async () => {
    favoritesFacade = new FavoritesFacadeStub();
    favoriteCollection = new FavoriteCollectionFacadeStub();
    stopDirectory = new StopDirectoryFacadeStub();
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
        { provide: FavoriteCollectionFacade, useValue: favoriteCollection },
        { provide: StopDirectoryFacade, useValue: stopDirectory },
        { provide: OverlayDialogService, useValue: dialog },
        { provide: LanguageService, useValue: languageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesComponent);
    component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('renders stop favorites grouped by municipality and line favorites in the same experience', () => {
    favoriteCollection.emit(FAVORITES, LINE_FAVORITES);
    fixture.detectChanges();

    const titleElements = fixture.nativeElement.querySelectorAll(
      '.favorites__group-title'
    ) as NodeListOf<HTMLElement>;
    expect(Array.from(titleElements).map((title) => title.textContent?.trim())).toEqual([
      'Granada',
      'Sevilla'
    ]);

    const entityTitles = fixture.nativeElement.querySelectorAll(
      '.favorites__entity-title'
    ) as NodeListOf<HTMLElement>;
    expect(Array.from(entityTitles).map((title) => title.textContent?.trim())).toEqual([
      'Líneas',
      'Paradas'
    ]);
    expect(fixture.nativeElement.textContent).toContain('Circular Huércal de Almería');
  });

  it('filters both stop and line favorites with the same search field', () => {
    favoriteCollection.emit(FAVORITES, LINE_FAVORITES);
    fixture.detectChanges();

    accessProtected(component).searchControl.setValue('huercal');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Circular Huércal de Almería');
    expect(fixture.nativeElement.textContent).not.toContain('Triana');
  });

  it('searches the stop directory in add mode and toggles the selected stop favorite', fakeAsync(() => {
    stopDirectory.searchStops.and.returnValue(of([DIRECTORY_OPTION]));
    fixture.detectChanges();

    const access = accessProtected(component);
    access.toggleAddMode.call(component);
    fixture.detectChanges();
    access.searchControl.setValue('Ada');
    tick(APP_CONFIG.homeData.search.debounceMs);
    fixture.detectChanges();

    expect(stopDirectory.searchStops).toHaveBeenCalledWith({
      query: 'ada',
      limit: APP_CONFIG.homeData.search.maxAutocompleteOptions
    });

    const result = fixture.nativeElement.querySelector(
      '.favorites__add-result'
    ) as HTMLButtonElement;
    expect(result.textContent).toContain('Ada Byron IES (Universidad)');
    expect(result.textContent).not.toContain('NN');

    result.click();
    expect(favoritesFacade.toggle).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: DIRECTORY_OPTION.id, nucleus: '' })
    );
  }));

  it('does not query the directory while add mode is closed', fakeAsync(() => {
    fixture.detectChanges();
    accessProtected(component).searchControl.setValue('Ada');
    tick(APP_CONFIG.homeData.search.debounceMs);
    fixture.detectChanges();

    expect(stopDirectory.searchStops).not.toHaveBeenCalled();
  }));

  it('does not render a nucleus chip when stop metadata is missing', () => {
    favoriteCollection.emit([{ ...FAVORITES[0], nucleus: '' }], []);
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll(
      '.favorites-card__chip'
    ) as NodeListOf<HTMLElement>;
    expect(chips.length).toBe(1);
    expect(chips[0]?.textContent).toContain('001');
  });

  it('builds canonical stop and line detail navigation', () => {
    const access = accessProtected(component);
    const stop = toStopListItem(FAVORITES[0]);

    expect(access.stopDetailCommands.call(component, stop)).toEqual([
      '/',
      APP_CONFIG.routes.stopDetailBase,
      'sevilla:001'
    ]);
    expect(access.stopDetailQueryParams.call(component, stop)).toEqual({
      [APP_CONFIG.routeParams.stopInfo.consortiumId]: '7'
    });
    expect(access.lineDetailCommands.call(component, LINE_FAVORITES[0])).toEqual([
      '/',
      'lines',
      '6',
      '100'
    ]);
  });

  it('removes stop and line favorites through the aggregate facade after confirmation', async () => {
    dialog.setResponse(true);
    const access = accessProtected(component);

    await access.removeStop.call(component, toStopListItem(FAVORITES[0]));
    await access.removeLine.call(component, LINE_FAVORITES[0]);

    expect(favoriteCollection.removeStop).toHaveBeenCalledWith('sevilla-001');
    expect(favoriteCollection.removeLine).toHaveBeenCalledWith('6|100');
  });

  it('does not remove an entity when confirmation is rejected', async () => {
    dialog.setResponse(false);
    const access = accessProtected(component);

    await access.removeLine.call(component, LINE_FAVORITES[0]);

    expect(favoriteCollection.removeLine).not.toHaveBeenCalled();
  });

  it('clears both favorite stores after aggregate confirmation', async () => {
    favoriteCollection.emit(FAVORITES, LINE_FAVORITES);
    fixture.detectChanges();
    dialog.setResponse(true);

    await accessProtected(component).clearAll.call(component);

    expect(favoriteCollection.clear).toHaveBeenCalled();
    expect(dialog.lastData()).toEqual(
      jasmine.objectContaining({
        details: jasmine.arrayContaining([
          jasmine.objectContaining({ value: '5' })
        ])
      })
    );
  });
});
