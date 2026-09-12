import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { StopDirectoryOption } from '@data/stops/stop-directory.service';
import {
  StopFavoriteStoredItem,
  StopFavoritesStorage
} from '@data/stops/stop-favorites.storage';
import { StopFavoritesService } from '@domain/stops/stop-favorites.service';

const STORED_SENTINEL_FAVORITE: StopFavoriteStoredItem = {
  id: '8:79',
  code: '79',
  name: 'La Gangosa - Av. Prado',
  municipality: 'Vícar',
  municipalityId: 'vicar',
  nucleus: ' NN ',
  nucleusId: 'unknown',
  consortiumId: 8,
  stopIds: ['79']
};

const RAW_SENTINEL_OPTION: StopDirectoryOption = {
  id: '8:80',
  code: '80',
  name: 'Bulevar Ciudad de Vícar',
  municipality: 'Vícar',
  municipalityId: 'vicar',
  nucleus: ' nN ',
  nucleusId: 'unknown',
  consortiumId: 8,
  stopIds: ['80']
};

describe('StopFavoritesService', () => {
  let storage: jasmine.SpyObj<StopFavoritesStorage>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StopFavoritesStorage>('StopFavoritesStorage', [
      'load',
      'save',
      'clear'
    ]);
    storage.load.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        StopFavoritesService,
        { provide: StopFavoritesStorage, useValue: storage }
      ]
    });
  });

  it('normalizes historical NN metadata loaded from storage', async () => {
    storage.load.and.returnValue([STORED_SENTINEL_FAVORITE]);
    const service = TestBed.inject(StopFavoritesService);

    const favorites = await firstValueFrom(service.favorites$);

    expect(favorites).toHaveSize(1);
    expect(favorites[0]?.nucleus).toBe('');
    expect(favorites[0]?.id).toBe(STORED_SENTINEL_FAVORITE.id);
    expect(favorites[0]?.stopIds).toEqual(STORED_SENTINEL_FAVORITE.stopIds);
  });

  it('persists newly added favorites without the NN sentinel', async () => {
    const service = TestBed.inject(StopFavoritesService);

    service.add(RAW_SENTINEL_OPTION);
    const favorites = await firstValueFrom(service.favorites$);

    expect(favorites[0]?.nucleus).toBe('');
    expect(storage.save).toHaveBeenCalledOnceWith([
      jasmine.objectContaining({ id: RAW_SENTINEL_OPTION.id, nucleus: '' })
    ]);
  });

  it('does not create duplicate favorites for repeated adds', async () => {
    const service = TestBed.inject(StopFavoritesService);

    service.add(RAW_SENTINEL_OPTION);
    service.add(RAW_SENTINEL_OPTION);
    const favorites = await firstValueFrom(service.favorites$);

    expect(favorites).toHaveSize(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
  });
});
