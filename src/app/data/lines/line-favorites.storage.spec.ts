import { TestBed } from '@angular/core/testing';
import { RuntimeFlagsService } from '@core/runtime/runtime-flags.service';
import {
  LineFavoriteStoredItem,
  LineFavoritesStorage
} from '@data/lines/line-favorites.storage';

const STORAGE_KEY = 'andalucia-transit.lineFavorites';
const FAVORITE: LineFavoriteStoredItem = {
  id: '6|100',
  consortiumId: 6,
  lineId: '100',
  code: 'M-100',
  name: 'Circular Huércal de Almería',
  mode: 'Autobús'
};

class RuntimeFlagsStub {
  mockMode: 'data' | 'empty' | null = null;

  mockDataMode(): 'data' | 'empty' | null {
    return this.mockMode;
  }
}

describe('LineFavoritesStorage', () => {
  let storage: LineFavoritesStorage;
  let runtimeFlags: RuntimeFlagsStub;

  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    runtimeFlags = new RuntimeFlagsStub();
    TestBed.configureTestingModule({
      providers: [
        LineFavoritesStorage,
        { provide: RuntimeFlagsService, useValue: runtimeFlags }
      ]
    });
    storage = TestBed.inject(LineFavoritesStorage);
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('round-trips valid favorites through local storage', () => {
    storage.save([FAVORITE]);

    expect(storage.load()).toEqual([FAVORITE]);
  });

  it('ignores malformed JSON, non-arrays, and invalid entries', () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken');
    expect(storage.load()).toEqual([]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: FAVORITE.id }));
    expect(storage.load()).toEqual([]);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        null,
        { ...FAVORITE, consortiumId: 0 },
        { ...FAVORITE, consortiumId: 6.5 },
        { ...FAVORITE, lineId: '   ' },
        { ...FAVORITE, code: '' },
        { ...FAVORITE, name: ' ' },
        { ...FAVORITE, mode: 42 },
        FAVORITE
      ])
    );

    expect(storage.load()).toEqual([FAVORITE]);
  });

  it('trims persisted string fields while preserving the stored identity', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          ...FAVORITE,
          id: 'legacy-id',
          lineId: ' 100 ',
          code: ' M-100 ',
          name: ' Circular Huércal de Almería ',
          mode: ' Autobús '
        }
      ])
    );

    expect(storage.load()).toEqual([
      {
        ...FAVORITE,
        id: 'legacy-id'
      }
    ]);
  });

  it('uses the in-memory value when local storage reads fail', () => {
    storage.save([FAVORITE]);
    spyOn(Storage.prototype, 'getItem').and.throwError('Storage blocked');

    expect(storage.load()).toEqual([FAVORITE]);
  });

  it('keeps mutations usable when local storage writes fail', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('Quota exceeded');

    expect(() => storage.save([FAVORITE])).not.toThrow();
    expect(storage.load()).toEqual([FAVORITE]);
  });

  it('keeps clear usable when local storage removal fails', () => {
    storage.save([FAVORITE]);
    const removeItem = spyOn(Storage.prototype, 'removeItem').and.throwError('Storage blocked');

    expect(() => storage.clear()).not.toThrow();
    expect(storage.load()).toEqual([]);

    removeItem.and.callThrough();
  });

  it('clears persisted favorites', () => {
    storage.save([FAVORITE]);

    storage.clear();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.load()).toEqual([]);
  });

  it('uses the canonical catalog line in data mode without mutating persisted user data', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...FAVORITE, name: 'Persisted' }]));
    runtimeFlags.mockMode = 'data';

    expect(storage.load()).toEqual([
      {
        id: '6|1',
        consortiumId: 6,
        lineId: '1',
        code: 'M-101',
        name: 'Almería - Huércal - Viator - Campamento',
        mode: 'AUTOBUS'
      }
    ]);

    storage.save([{ ...FAVORITE, name: 'Changed' }]);
    storage.clear();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify([{ ...FAVORITE, name: 'Persisted' }])
    );
  });

  it('uses an empty deterministic collection in empty mode', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([FAVORITE]));
    runtimeFlags.mockMode = 'empty';

    expect(storage.load()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([FAVORITE]));
  });
});
