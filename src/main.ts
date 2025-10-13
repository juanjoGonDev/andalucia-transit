import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEnGb from '@angular/common/locales/en-GB';
import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

registerLocaleData(localeEs);
registerLocaleData(localeEnGb);

bootstrapApplication(AppComponent, appConfig).catch((error) => console.error(error));
