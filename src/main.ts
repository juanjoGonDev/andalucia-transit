import { registerLocaleData } from '@angular/common';
import localeEnGb from '@angular/common/locales/en-GB';
import localeEs from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '@app/app';
import { appConfig } from '@app/app.config';

registerLocaleData(localeEs);
registerLocaleData(localeEnGb);

bootstrapApplication(AppComponent, appConfig).catch((error) => console.error(error));
