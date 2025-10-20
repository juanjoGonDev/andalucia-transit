import { InjectionToken } from '@angular/core';
import { APP_CONFIG, AppConfig } from '../config';

export const APP_CONFIG_TOKEN = new InjectionToken<AppConfig>('APP_CONFIG_TOKEN', {
  providedIn: 'root',
  factory: () => APP_CONFIG
});
