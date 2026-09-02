import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService } from '@core/services/pwa-update.service';

class SwUpdateStub {
  readonly versionUpdates = new Subject<VersionEvent>();
  readonly unrecoverable = new Subject<{ reason: string; type: 'UNRECOVERABLE_STATE' }>();
  isEnabled = true;
  checkForUpdate = jasmine.createSpy('checkForUpdate').and.resolveTo(false);
  activateUpdate = jasmine.createSpy('activateUpdate').and.resolveTo(true);
}

describe('PwaUpdateService', () => {
  let service: PwaUpdateService;
  let swUpdate: SwUpdateStub;
  let reloadSpy: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    swUpdate = new SwUpdateStub();
    TestBed.configureTestingModule({
      providers: [PwaUpdateService, { provide: SwUpdate, useValue: swUpdate }]
    });
    service = TestBed.inject(PwaUpdateService);
    reloadSpy = spyOn(service, 'reloadCurrentVersion');
  });

  it('checks for a new version when initialized', () => {
    service.initialize();

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('keeps the current version when the startup update check fails', async () => {
    swUpdate.checkForUpdate.and.rejectWith(new Error('offline'));

    service.initialize();
    await Promise.resolve();
    await Promise.resolve();

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('activates and reloads when a new version is ready', async () => {
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    await Promise.resolve();

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('still reloads an activated version when recovery-marker cleanup is unavailable', async () => {
    spyOn(Storage.prototype, 'removeItem').and.throwError('storage blocked');
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    await Promise.resolve();

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores non-ready version events', () => {
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_DETECTED',
      version: { hash: 'new', appData: undefined }
    });

    expect(swUpdate.activateUpdate).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('does not reload when activation reports that no version was activated', async () => {
    swUpdate.activateUpdate.and.resolveTo(false);
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    await Promise.resolve();

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('allows a later ready event to retry after an empty activation', async () => {
    swUpdate.activateUpdate.and.resolveTo(false);
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    await Promise.resolve();

    swUpdate.activateUpdate.and.resolveTo(true);
    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'newer', appData: undefined }
    });
    await Promise.resolve();

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(2);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reload when activation fails', async () => {
    swUpdate.activateUpdate.and.rejectWith(new Error('activation failed'));
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('ignores duplicate ready events while activation is in progress', async () => {
    let resolveActivation: ((value: boolean) => void) | undefined;
    swUpdate.activateUpdate.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveActivation = resolve;
      })
    );
    service.initialize();

    const readyEvent: VersionEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    };
    swUpdate.versionUpdates.next(readyEvent);
    swUpdate.versionUpdates.next(readyEvent);

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);

    resolveActivation?.(true);
    await Promise.resolve();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does not request a second reload when unrecoverable recovery overlaps activation', async () => {
    let resolveActivation: ((value: boolean) => void) | undefined;
    swUpdate.activateUpdate.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveActivation = resolve;
      })
    );
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    swUpdate.unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'cache mismatch'
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('andalucia-transit:pwa-recovery')).toBe('1');

    resolveActivation?.(true);
    await Promise.resolve();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('andalucia-transit:pwa-recovery')).toBe('1');
  });

  it('is a no-op when the service worker is disabled', () => {
    swUpdate.isEnabled = false;

    service.initialize();
    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });

    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
    expect(swUpdate.activateUpdate).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reloads once for an unrecoverable worker state', () => {
    service.initialize();

    swUpdate.unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'cache mismatch'
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('andalucia-transit:pwa-recovery')).toBe('1');
  });

  it('guards unrecoverable recovery against reload loops', () => {
    sessionStorage.setItem('andalucia-transit:pwa-recovery', '1');
    service.initialize();

    swUpdate.unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'cache mismatch'
    });

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('does not auto-reload when the unrecoverable recovery guard cannot be read', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('storage blocked');
    service.initialize();

    swUpdate.unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'cache mismatch'
    });

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('does not auto-reload when the unrecoverable recovery guard cannot be persisted', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('storage blocked');
    service.initialize();

    swUpdate.unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'cache mismatch'
    });

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('initializes only once', async () => {
    service.initialize();
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });
    await Promise.resolve();

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
