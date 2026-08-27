import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink, provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config';
import { StopFavorite } from '@domain/stops/favorites.facade';
import { HomeFavoritesPreviewComponent } from '@features/home/favorites-preview/home-favorites-preview.component';

const FAVORITE: StopFavorite = {
  id: '7:119',
  code: '119',
  name: 'Plaza Nueva',
  municipality: 'Sevilla',
  municipalityId: 'sevilla',
  nucleus: 'Centro',
  nucleusId: 'centro',
  consortiumId: 7,
  stopIds: ['119']
};

describe('HomeFavoritesPreviewComponent', () => {
  let fixture: ComponentFixture<HomeFavoritesPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeFavoritesPreviewComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeFavoritesPreviewComponent);
  });

  it('links a favorite with its canonical consortium identity', () => {
    fixture.componentRef.setInput('favorites', [FAVORITE]);
    fixture.detectChanges();

    const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);

    expect(routerLink.urlTree.toString()).toBe(`/${APP_CONFIG.routes.stopDetailBase}/119?consortiumId=7`);
    expect(routerLink.queryParams).toEqual({
      [APP_CONFIG.routeParams.stopInfo.consortiumId]: '7'
    });
  });
});
