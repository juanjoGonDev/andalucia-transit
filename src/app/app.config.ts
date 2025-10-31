import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  ApplicationConfig,
  LOCALE_ID,
  importProvidersFrom,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { routes } from '@app/app.routes';
import { APP_CONFIG } from '@core/config';
import { LocalizedTitleStrategy } from '@core/routing/localized-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: APP_CONFIG.locales.default },
    provideRouter(routes),
    { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    importProvidersFrom(OverlayModule),
    importProvidersFrom(A11yModule),
    importProvidersFrom(MatNativeDateModule),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: APP_CONFIG.locales.default,
        compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
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
