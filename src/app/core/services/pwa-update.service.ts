import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

const PWA_RECOVERY_SESSION_KEY = 'andalucia-transit:pwa-recovery';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private initialized = false;

  initialize(): void {
    if (this.initialized || !this.swUpdate.isEnabled) {
      return;
    }

    this.initialized = true;

    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => void this.activateReadyVersion());

    this.swUpdate.unrecoverable.subscribe(() => this.recoverUnrecoverableState());
  }

  reloadCurrentVersion(): void {
    globalThis.location.reload();
  }

  private async activateReadyVersion(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      sessionStorage.removeItem(PWA_RECOVERY_SESSION_KEY);
      this.reloadCurrentVersion();
    } catch {
      // Keep the currently loaded, internally consistent version when activation fails.
    }
  }

  private recoverUnrecoverableState(): void {
    if (sessionStorage.getItem(PWA_RECOVERY_SESSION_KEY) === '1') {
      return;
    }

    sessionStorage.setItem(PWA_RECOVERY_SESSION_KEY, '1');
    this.reloadCurrentVersion();
  }
}
