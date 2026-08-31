import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

const PWA_RECOVERY_SESSION_KEY = 'andalucia-transit:pwa-recovery';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private initialized = false;
  private activationInProgress = false;

  initialize(): void {
    if (this.initialized || !this.swUpdate.isEnabled) {
      return;
    }

    this.initialized = true;

    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => void this.activateReadyVersion());

    this.swUpdate.unrecoverable.subscribe(() => this.recoverUnrecoverableState());
    void this.checkForUpdate();
  }

  reloadCurrentVersion(): void {
    globalThis.location.reload();
  }

  private async checkForUpdate(): Promise<void> {
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
      // Keep the current version when an update check cannot reach the server.
    }
  }

  private async activateReadyVersion(): Promise<void> {
    if (this.activationInProgress) {
      return;
    }

    this.activationInProgress = true;

    try {
      const activated = await this.swUpdate.activateUpdate();
      if (!activated) {
        this.activationInProgress = false;
        return;
      }

      sessionStorage.removeItem(PWA_RECOVERY_SESSION_KEY);
      this.reloadCurrentVersion();
    } catch {
      this.activationInProgress = false;
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
