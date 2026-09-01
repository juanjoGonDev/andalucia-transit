import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import { LanguageService } from '@core/services/language.service';
import { ConsortiumCatalogService } from '@data/catalog/consortium-catalog.service';
import {
  LineDirectoryEntry,
  LineDirectoryService
} from '@domain/lines/line-directory.service';
import {
  LineFavorite,
  LineFavoritesFacade
} from '@domain/lines/line-favorites.facade';
import { LinesComponent } from '@features/lines/lines.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class CatalogStub {
  loadConsortiums() {
    return of([{ id: 6, name: 'Área de Almería', shortName: 'CTAL', province: 'Almería' }]);
  }

  loadMunicipalities() {
    return of([]);
  }

  loadNuclei() {
    return of([]);
  }
}

class DirectoryStub {
  loadAllLines() {
    return of([LINE]);
  }

  loadLineKeysForGeography() {
    return of(null);
  }

  loadNearbyLineKeys() {
    return of(new Set<string>());
  }
}

class LineFavoritesStub {
  private readonly subject = new BehaviorSubject<readonly LineFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly toggle = jasmine.createSpy('toggle');

  emit(favorites: readonly LineFavorite[]): void {
    this.subject.next(favorites);
  }
}

const LINE: LineDirectoryEntry = {
  consortiumId: 6,
  areaName: 'Área de Almería',
  lineId: '100',
  code: 'M-100',
  name: 'Circular Huércal de Almería',
  mode: 'AUTOBUS',
  operators: ['Operador']
};

const languageService = {
  currentLanguage: signal<'es' | 'en'>('es').asReadonly()
};

interface LinesComponentAccess {
  isLineFavorite(line: LineDirectoryEntry): boolean;
  favoriteLabelKey(line: LineDirectoryEntry): string;
  favoriteIcon(line: LineDirectoryEntry): string;
  toggleFavorite(line: LineDirectoryEntry): void;
  lineCommands(line: LineDirectoryEntry): readonly string[];
}

describe('LinesComponent favorites', () => {
  let fixture: ComponentFixture<LinesComponent>;
  let lineFavorites: LineFavoritesStub;
  let access: LinesComponentAccess;

  beforeEach(() => {
    lineFavorites = new LineFavoritesStub();

    TestBed.configureTestingModule({
      imports: [
        LinesComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) }
          }
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } },
        { provide: ConsortiumCatalogService, useClass: CatalogStub },
        { provide: LineDirectoryService, useClass: DirectoryStub },
        { provide: LineFavoritesFacade, useValue: lineFavorites },
        { provide: GeolocationService, useValue: { getCurrentPosition: jasmine.createSpy('getCurrentPosition') } },
        { provide: LanguageService, useValue: languageService }
      ]
    });

    fixture = TestBed.createComponent(LinesComponent);
    access = fixture.componentInstance as unknown as LinesComponentAccess;
  });

  it('toggles a directory line through the canonical line favorite facade', () => {
    expect(access.isLineFavorite(LINE)).toBeFalse();
    expect(access.favoriteLabelKey(LINE)).toBe('favorites.actions.addLine');
    expect(access.favoriteIcon(LINE)).toBe('star_border');

    access.toggleFavorite(LINE);

    expect(lineFavorites.toggle).toHaveBeenCalledOnceWith({
      consortiumId: 6,
      lineId: '100',
      code: 'M-100',
      name: 'Circular Huércal de Almería',
      mode: 'AUTOBUS'
    });
  });

  it('reacts to favorite state emitted by another surface', () => {
    lineFavorites.emit([
      {
        id: '6|100',
        consortiumId: 6,
        lineId: '100',
        code: 'M-100',
        name: 'Circular Huércal de Almería',
        mode: 'AUTOBUS'
      }
    ]);

    expect(access.isLineFavorite(LINE)).toBeTrue();
    expect(access.favoriteLabelKey(LINE)).toBe('favorites.actions.removeLine');
    expect(access.favoriteIcon(LINE)).toBe('star');
  });

  it('keeps favorite mutation separate from descriptive line navigation', () => {
    expect(access.lineCommands(LINE)).toEqual([
      '/',
      'lines',
      '6',
      '100',
      'circular-huercal-de-almeria'
    ]);
  });
});
