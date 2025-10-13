import {
  ApplicationConfig,
  LOCALE_ID,
  importProvidersFrom,
  isDevMode,
  provideZoneChangeDetection,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { MatDialogModule } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: APP_CONFIG.locales.default },
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    importProvidersFrom(MatDialogModule),
    importProvidersFrom(MatNativeDateModule),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: APP_CONFIG.locales.default
      })
    ),
    provideTranslateHttpLoader({
      prefix: APP_CONFIG.locales.assetsPath,
      suffix: APP_CONFIG.locales.fileExtension
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
