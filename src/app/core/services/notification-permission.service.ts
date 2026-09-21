import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

const SUPPORTED_PERMISSION: NotificationPermissionState = 'granted';

/**
 * Thin, SSR-safe wrapper around the Notifications permission API so features
 * can react to the current state and (re-)request access from user gestures.
 */
@Injectable({ providedIn: 'root' })
export class NotificationPermissionService {
  private readonly stateSubject = new BehaviorSubject<NotificationPermissionState>(
    readPermissionState()
  );
  readonly permission$: Observable<NotificationPermissionState> =
    this.stateSubject.asObservable();

  get snapshot(): NotificationPermissionState {
    return this.stateSubject.getValue();
  }

  get isSupported(): boolean {
    return this.snapshot !== 'unsupported';
  }

  /** Requests permission from a user gesture. Resolves immediately when already decided. */
  async request(): Promise<NotificationPermissionState> {
    const current = this.refresh();

    if (current === 'granted' || current === 'unsupported') {
      return current;
    }

    if (typeof window === 'undefined' || typeof Notification !== 'function') {
      this.stateSubject.next('unsupported');
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      const state = normalizePermission(result);
      this.stateSubject.next(state);
      return state;
    } catch {
      return this.snapshot;
    }
  }

  /** Re-reads the browser state (e.g. after the user changes site settings). */
  refresh(): NotificationPermissionState {
    const state = readPermissionState();
    this.stateSubject.next(state);
    return state;
  }

  /** Displays a notification when (and only when) permission was granted. */
  show(title: string, options?: NotificationOptions): boolean {
    if (this.snapshot !== SUPPORTED_PERMISSION) {
      return false;
    }

    if (typeof window === 'undefined' || typeof Notification !== 'function') {
      return false;
    }

    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch {
      return false;
    }
  }
}

function readPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification !== 'function') {
    return 'unsupported';
  }

  return normalizePermission(Notification.permission);
}

function normalizePermission(value: unknown): NotificationPermissionState {
  return value === 'granted' || value === 'denied' || value === 'default' ? value : 'default';
}
