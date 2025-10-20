import { Injectable, inject } from '@angular/core';
import { AppConfig } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';

@Injectable({ providedIn: 'root' })
export class TransitApiService {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  getBaseUrl(): string {
    return this.config.apiBaseUrl;
  }
}
