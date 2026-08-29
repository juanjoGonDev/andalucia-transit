import { Routes } from '@angular/router';
import { APP_CONFIG } from '@core/config';
import { FavoritesComponent } from '@features/favorites/favorites.component';
import { HomeComponent } from '@features/home/home.component';
import { LEGAL_ROUTE_SEGMENTS } from '@features/legal/legal-shell-content';
import { AppLayoutComponent } from '@shared/layout/app-layout/app-layout.component';
import {
  LINE_DETAIL_BASE_SEGMENT,
  LINE_DETAIL_ROUTE_PATTERN,
  NEWS_DETAIL_ROUTE_PATTERN
} from '@shared/navigation/navigation.util';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: APP_CONFIG.routes.home,
        component: HomeComponent,
        title: APP_CONFIG.translationKeys.navigation.home
      },
      {
        path: APP_CONFIG.routes.homeRecent,
        component: HomeComponent,
        title: APP_CONFIG.translationKeys.navigation.home
      },
      {
        path: APP_CONFIG.routes.homeFavorites,
        component: HomeComponent,
        title: APP_CONFIG.translationKeys.navigation.home
      },
      {
        path: APP_CONFIG.routes.favorites,
        component: FavoritesComponent,
        title: APP_CONFIG.translationKeys.navigation.favorites
      },
      {
        path: NEWS_DETAIL_ROUTE_PATTERN,
        loadComponent: () =>
          import('@features/news/news-detail.component').then((module) => module.NewsDetailComponent),
        title: APP_CONFIG.translationKeys.navigation.news
      },
      {
        path: APP_CONFIG.routes.news,
        loadComponent: () =>
          import('@features/news/news.component').then((module) => module.NewsComponent),
        title: APP_CONFIG.translationKeys.navigation.news
      },
      {
        path: APP_CONFIG.routes.stopInfoPattern,
        loadComponent: () =>
          import('@features/stop-info/stop-info-redirect.component').then(
            (module) => module.StopInfoRedirectComponent
          ),
        title: APP_CONFIG.translationKeys.navigation.stopDetail
      },
      {
        path: APP_CONFIG.routes.stopDetailPattern,
        loadComponent: () =>
          import('@features/stop-detail/stop-detail.component').then((module) => module.StopDetailComponent),
        title: APP_CONFIG.translationKeys.navigation.stopDetail
      },
      {
        path: LINE_DETAIL_BASE_SEGMENT,
        loadComponent: () =>
          import('@features/lines/lines.component').then((module) => module.LinesComponent),
        title: APP_CONFIG.translationKeys.navigation.lines
      },
      {
        path: LINE_DETAIL_ROUTE_PATTERN,
        loadComponent: () =>
          import('@features/line-detail/line-detail.component').then((module) => module.LineDetailComponent),
        title: APP_CONFIG.translationKeys.navigation.lines
      },
      {
        path: APP_CONFIG.routes.routeSearchResultPattern,
        loadComponent: () =>
          import('@features/route-search/route-search.component').then(
            (module) => module.RouteSearchComponent
          ),
        title: APP_CONFIG.translationKeys.navigation.routeSearch
      },
      {
        path: APP_CONFIG.routes.routeSearch,
        loadComponent: () =>
          import('@features/route-search/route-search.component').then(
            (module) => module.RouteSearchComponent
          ),
        title: APP_CONFIG.translationKeys.navigation.routeSearch
      },
      {
        path: APP_CONFIG.routes.settings,
        loadComponent: () =>
          import('@features/settings/settings.component').then((module) => module.SettingsComponent),
        title: APP_CONFIG.translationKeys.settings.title
      },
      {
        path: APP_CONFIG.routes.map,
        loadComponent: () =>
          import('@features/map/map.component').then((module) => module.MapComponent),
        title: APP_CONFIG.translationKeys.navigation.map
      },
      {
        path: LEGAL_ROUTE_SEGMENTS.base,
        loadChildren: () =>
          import('@features/legal/legal.routes').then((module) => module.LEGAL_ROUTES)
      }
    ]
  },
  { path: '**', redirectTo: APP_CONFIG.routes.home, pathMatch: 'full' }
];
