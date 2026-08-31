import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  LineFavoriteStoredItem,
  LineFavoritesStorage
} from '@data/lines/line-favorites.storage';
import {
  LineFavoriteCandidate,
  LineFavoritesService
} from '@domain/lines/line-favorites.service';

const STORED_LINE: LineFavoriteStoredItem = {
  id: '6|101',
  consortiumId: 6,
  lineId: '101',
  code: 'M-101',
  name: 'Almería - Huércal - Viator - Campamento NN',
  mode: 'Autobús'
};

const CANDIDATE: LineFavoriteCandidate = {
  consortiumId: 6,
  lineId: '101',
  code: 'M-101',
  name: 'Almería - Huércal - Viator - Campamento NN',
  mode: 'Autobús'
};

describe('LineFavoritesService', () => {
  let storage: jasmine.SpyObj<LineFavoritesStorage>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<LineFavoritesStorage>('LineFavoritesStorage', [
      'load',
      'save',
      'clear'
    ]);
    storage.load.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        LineFavoritesService,
        { provide: LineFavoritesStorage, useValue: storage }
      ]
    });
  });

  it('hydrates persisted line favorites with normalized display names', async () => {
    storage.load.and.returnValue([STORED_LINE]);
    const service = TestBed.inject(LineFavoritesService);

    const favorites = await firstValueFrom(service.favorites$);

    expect(favorites).toEqual([
      jasmine.objectContaining({
        id: '6|101',
        name: 'Almería - Huércal - Viator - Campamento'
      })
    ]);
  });

  it('persists one consortium-aware favorite for repeated adds', async () => {
    const service = TestBed.inject(LineFavoritesService);

    service.add(CANDIDATE);
    service.add(CANDIDATE);
    const favorites = await firstValueFrom(service.favorites$);

    expect(favorites).toHaveSize(1);
    expect(favorites[0]).toEqual(
      jasmine.objectContaining({ id: '6|101', name: 'Almería - Huércal - Viator - Campamento' })
    );
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  it('toggles and clears line favorites without touching another entity store', async () => {
    const service = TestBed.inject(LineFavoritesService);

    service.toggle(CANDIDATE);
    expect((await firstValueFrom(service.favorites$)).length).toBe(1);

    service.toggle(CANDIDATE);
    expect((await firstValueFrom(service.favorites$)).length).toBe(0);
    expect(storage.clear).toHaveBeenCalled();
  });

  it('toggles an existing favorite when the candidate line id only differs by whitespace', async () => {
    const service = TestBed.inject(LineFavoritesService);

    service.add(CANDIDATE);
    service.toggle({ ...CANDIDATE, lineId: ' 101 ' });

    expect(await firstValueFrom(service.favorites$)).toEqual([]);
    expect(storage.clear).toHaveBeenCalled();
  });
});
