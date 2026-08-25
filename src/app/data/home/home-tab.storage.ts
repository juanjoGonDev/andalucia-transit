import { Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config';
import { HOME_TABS, HomeTabId } from '@features/home/home.types';

@Injectable({ providedIn: 'root' })
export class HomeTabStorage {
  private readonly storageKey = APP_CONFIG.homeData.tabs.storageKey;
  private readonly supportedTabs = new Set<HomeTabId>(HOME_TABS);
  private memoryValue: HomeTabId | null = null;

  read(): HomeTabId | null {
    const raw = this.readRawValue();
    if (!this.isSupported(raw)) {
      this.writeRawValue(null);
      return null;
    }
    return raw;
  }

  write(tab: HomeTabId): void {
    this.writeRawValue(tab);
  }

  clear(): void {
    this.writeRawValue(null);
  }

  private isSupported(value: unknown): value is HomeTabId {
    if (typeof value !== 'string') {
      return false;
    }
    return this.supportedTabs.has(value as HomeTabId);
  }

  private readRawValue(): HomeTabId | null {
    const storageValue = this.readFromStorage();
    if (storageValue === null) {
      return this.memoryValue;
    }
    return storageValue;
  }

  private readFromStorage(): HomeTabId | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    const value = window.localStorage.getItem(this.storageKey);
    if (!this.isSupported(value)) {
      return null;
    }
    return value;
  }

  private writeRawValue(value: HomeTabId | null): void {
    this.writeToStorage(value);
    this.memoryValue = value;
  }

  private writeToStorage(value: HomeTabId | null): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    if (value === null) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }
    window.localStorage.setItem(this.storageKey, value);
  }
}
