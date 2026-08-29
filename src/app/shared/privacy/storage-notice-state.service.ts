import { Injectable } from '@angular/core';

export const STORAGE_NOTICE_STORAGE_KEY = 'andalucia-transit.privacyNotice.v1' as const;
export const STORAGE_NOTICE_DISMISSED_VALUE = 'dismissed' as const;

const storageAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

@Injectable({ providedIn: 'root' })
export class StorageNoticeStateService {
  isDismissed(): boolean {
    if (!storageAvailable()) {
      return false;
    }

    try {
      return window.localStorage.getItem(STORAGE_NOTICE_STORAGE_KEY) === STORAGE_NOTICE_DISMISSED_VALUE;
    } catch {
      return false;
    }
  }

  dismiss(): void {
    if (!storageAvailable()) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_NOTICE_STORAGE_KEY, STORAGE_NOTICE_DISMISSED_VALUE);
    } catch {
      // Storage may be blocked by the browser. The notice remains dismissible for this runtime session.
    }
  }
}
