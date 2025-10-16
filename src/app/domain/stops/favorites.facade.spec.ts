import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { FavoritesFacade } from './favorites.facade';
import { StopFavoritesService, StopFavorite } from './stop-favorites.service';
import type { StopDirectoryOption } from '../../data/stops/stop-directory.service';

describe('FavoritesFacade', () => {
  let facade: FavoritesFacade;
  let service: jasmine.SpyObj<StopFavoritesService>;
  let subject: BehaviorSubject<readonly StopFavorite[]>;

  const option: StopDirectoryOption = {
    id: 'stop-1',
    code: '001',
    name: 'Stop 1',
    municipality: 'City',
    municipalityId: 'city',
    nucleus: 'Center',
    nucleusId: 'center',
    consortiumId: 1,
    stopIds: ['1:001']
  };

  const favorites: readonly StopFavorite[] = [
    {
      id: 'stop-1',
      code: '001',
      name: 'Stop 1',
      municipality: 'City',
      municipalityId: 'city',
      nucleus: 'Center',
      nucleusId: 'center',
      consortiumId: 1,
      stopIds: ['1:001']
    }
  ];

  beforeEach(() => {
    subject = new BehaviorSubject<readonly StopFavorite[]>(favorites);
    service = jasmine.createSpyObj<StopFavoritesService>(
      'StopFavoritesService',
      ['add', 'remove', 'clear', 'toggle', 'isFavorite'],
      { favorites$: subject.asObservable() }
    );

    TestBed.configureTestingModule({
      providers: [{ provide: StopFavoritesService, useValue: service }, FavoritesFacade]
    });

    facade = TestBed.inject(FavoritesFacade);
  });

  it('exposes favorites stream', (done) => {
    facade.favorites$.subscribe((value) => {
      expect(value).toEqual(favorites);
      done();
    });
  });

  it('adds favorites through the service', () => {
    facade.add(option);

    expect(service.add).toHaveBeenCalledWith(option);
  });

  it('removes favorites through the service', () => {
    facade.remove('stop-1');

    expect(service.remove).toHaveBeenCalledWith('stop-1');
  });

  it('clears favorites through the service', () => {
    facade.clear();

    expect(service.clear).toHaveBeenCalled();
  });

  it('toggles favorites through the service', () => {
    facade.toggle(option);

    expect(service.toggle).toHaveBeenCalledWith(option);
  });

  it('checks favorite existence through the service', () => {
    service.isFavorite.and.returnValue(true);

    expect(facade.isFavorite('stop-1')).toBeTrue();
    expect(service.isFavorite).toHaveBeenCalledWith('stop-1');
  });
});
