import { Routes } from '@angular/router';
import { APP_CONFIG } from './core/config';
import { FavoritesComponent } from './features/favorites/favorites.component';
import { HomeComponent } from './features/home/home.component';
import { RouteSearchComponent } from './features/route-search/route-search.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';

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
        path: APP_CONFIG.routes.news,
        loadComponent: () =>
          import('./features/news/news.component').then((module) => module.NewsComponent),
        title: APP_CONFIG.translationKeys.navigation.news
      },
      {
        path: APP_CONFIG.routes.stopInfoPattern,
        loadComponent: () =>
          import('./features/stop-info/stop-info.component').then((module) => module.StopInfoComponent),
        title: APP_CONFIG.translationKeys.navigation.stopInfo
      },
      {
        path: APP_CONFIG.routes.stopDetailPattern,
        loadComponent: () =>
          import('./features/stop-detail/stop-detail.component').then((module) => module.StopDetailComponent),
        title: APP_CONFIG.translationKeys.navigation.stopDetail
      },
      {
        path: APP_CONFIG.routes.routeSearchResultPattern,
        component: RouteSearchComponent,
        title: APP_CONFIG.translationKeys.navigation.routeSearch
      },
      {
        path: APP_CONFIG.routes.routeSearch,
        component: RouteSearchComponent,
        title: APP_CONFIG.translationKeys.navigation.routeSearch
      },
      {
        path: APP_CONFIG.routes.settings,
        loadComponent: () =>
          import('./features/settings/settings.component').then((module) => module.SettingsComponent),
        title: APP_CONFIG.translationKeys.settings.title
      },
      {
        path: APP_CONFIG.routes.map,
        loadComponent: () =>
          import('./features/map/map.component').then((module) => module.MapComponent),
        title: APP_CONFIG.translationKeys.navigation.map
      }
    ]
  },
  { path: '**', redirectTo: APP_CONFIG.routes.home, pathMatch: 'full' }
];
