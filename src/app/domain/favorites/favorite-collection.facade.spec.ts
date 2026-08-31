import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { FavoriteCollectionFacade } from '@domain/favorites/favorite-collection.facade';
import { LineFavorite, LineFavoritesFacade } from '@domain/lines/line-favorites.facade';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';

class StopFavoritesFacadeStub {
  readonly subject = new BehaviorSubject<readonly StopFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly remove = jasmine.createSpy('remove');
  readonly clear = jasmine.createSpy('clear');
}

class LineFavoritesFacadeStub {
  readonly subject = new BehaviorSubject<readonly LineFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly remove = jasmine.createSpy('remove');
  readonly clear = jasmine.createSpy('clear');
}

describe('FavoriteCollectionFacade', () => {
  let stopFavorites: StopFavoritesFacadeStub;
  let lineFavorites: LineFavoritesFacadeStub;
  let facade: FavoriteCollectionFacade;

  beforeEach(() => {
    stopFavorites = new StopFavoritesFacadeStub();
    lineFavorites = new LineFavoritesFacadeStub();
    TestBed.configureTestingModule({
      providers: [
        FavoriteCollectionFacade,
        { provide: FavoritesFacade, useValue: stopFavorites },
        { provide: LineFavoritesFacade, useValue: lineFavorites }
      ]
    });
    facade = TestBed.inject(FavoriteCollectionFacade);
  });

  it('combines stop and line favorites without duplicating their owners', (done) => {
    stopFavorites.subject.next([
      {
        id: '6:2125',
        code: '2125',
        name: 'Ada Byron IES',
        municipality: 'Málaga',
        municipalityId: 'malaga',
        nucleus: '',
        nucleusId: 'missing',
        consortiumId: 6,
        stopIds: ['2125']
      }
    ]);
    lineFavorites.subject.next([
      {
        id: '6|101',
        consortiumId: 6,
        lineId: '101',
        code: 'M-101',
        name: 'Almería - Huércal',
        mode: 'Autobús'
      }
    ]);

    facade.favorites$.subscribe((snapshot) => {
      expect(snapshot.stops).toHaveSize(1);
      expect(snapshot.lines).toHaveSize(1);
      expect(snapshot.total).toBe(2);
      done();
    });
  });

  it('routes removals and clear-all to the authoritative stores', () => {
    facade.removeStop('6:2125');
    facade.removeLine('6|101');
    facade.clear();

    expect(stopFavorites.remove).toHaveBeenCalledWith('6:2125');
    expect(lineFavorites.remove).toHaveBeenCalledWith('6|101');
    expect(stopFavorites.clear).toHaveBeenCalled();
    expect(lineFavorites.clear).toHaveBeenCalled();
  });
});
