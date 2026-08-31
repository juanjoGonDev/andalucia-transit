import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink, provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config';
import { LineFavorite } from '@domain/lines/line-favorites.facade';
import { StopFavorite } from '@domain/stops/favorites.facade';
import { HomeFavoritesPreviewComponent } from '@features/home/favorites-preview/home-favorites-preview.component';

const STOP_FAVORITE: StopFavorite = {
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

const LINE_FAVORITE: LineFavorite = {
  id: '6|100',
  consortiumId: 6,
  lineId: '100',
  code: 'M-100',
  name: 'Circular Huércal de Almería',
  mode: 'Autobús'
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

  it('links a stop favorite with its canonical consortium identity', () => {
    fixture.componentRef.setInput('favorites', [{ kind: 'stop', favorite: STOP_FAVORITE }]);
    fixture.detectChanges();

    const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);
    const urlTree = routerLink.urlTree;

    expect(urlTree).not.toBeNull();
    expect(urlTree?.toString()).toBe(`/${APP_CONFIG.routes.stopDetailBase}/119?consortiumId=7`);
    expect(routerLink.queryParams).toEqual({
      [APP_CONFIG.routeParams.stopInfo.consortiumId]: '7'
    });
  });

  it('links a line favorite to canonical line detail', () => {
    fixture.componentRef.setInput('favorites', [{ kind: 'line', favorite: LINE_FAVORITE }]);
    fixture.detectChanges();

    const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);

    expect(routerLink.urlTree?.toString()).toBe('/lines/6/100');
    expect(fixture.nativeElement.textContent).toContain('Circular Huércal de Almería');
    expect(fixture.nativeElement.textContent).toContain('M-100');
  });
});
