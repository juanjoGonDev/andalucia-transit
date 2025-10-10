import { Routes } from '@angular/router';

import { APP_CONFIG } from './core/config';
import { HomeComponent } from './features/home/home.component';
import { RouteSearchComponent } from './features/route-search/route-search.component';
import { MapComponent } from './features/map/map.component';

export const routes: Routes = [
  { path: APP_CONFIG.routes.home, component: HomeComponent, title: APP_CONFIG.translationKeys.navigation.home },
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
  { path: APP_CONFIG.routes.map, component: MapComponent, title: APP_CONFIG.translationKeys.navigation.map },
  { path: '**', redirectTo: APP_CONFIG.routes.home, pathMatch: 'full' }
];
