import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService } from '@core/services/pwa-update.service';

class SwUpdateStub {
  readonly versionUpdates = new Subject<VersionEvent>();
  readonly unrecoverable = new Subject<{ reason: string; type: 'UNRECOVERABLE_STATE' }>();
  isEnabled = true;
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

  it('ignores non-ready version events', () => {
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_DETECTED',
      version: { hash: 'new', appData: undefined }
    });

    expect(swUpdate.activateUpdate).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
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

  it('is a no-op when the service worker is disabled', () => {
    swUpdate.isEnabled = false;

    service.initialize();
    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });

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

  it('initializes only once', () => {
    service.initialize();
    service.initialize();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
  });
});
