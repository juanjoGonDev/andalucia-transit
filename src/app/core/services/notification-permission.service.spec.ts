import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NotificationPermissionService } from './notification-permission.service';

interface NotificationLike { onclick: (() => void) | null; close: () => void }

describe('NotificationPermissionService', () => {
  let service: NotificationPermissionService;
  let originalNotification: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification');
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationPermissionService);
  });

  function installNotification(permission: string, requestResult?: string): jasmine.Spy {
    const ctor = function (this: NotificationLike) {
      this.onclick = null;
      this.close = () => undefined;
    } as unknown as {
      new (title: string, options?: NotificationOptions): NotificationLike;
      permission: string;
      requestPermission: () => Promise<string>;
    };
    ctor.permission = permission;
    ctor.requestPermission = jasmine
      .createSpy('requestPermission')
      .and.resolveTo(requestResult ?? permission);

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: ctor
    });

    return ctor.requestPermission as jasmine.Spy;
  }

  afterEach(() => {
    if (originalNotification) {
      Object.defineProperty(window, 'Notification', originalNotification);
    } else {
      delete (window as { Notification?: unknown }).Notification;
    }
  });

  it('reports unsupported when the Notifications API is missing', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'Notification');

    if (original) {
      delete (window as { Notification?: unknown }).Notification;
    }

    try {
      expect(service.refresh()).toBe('unsupported');
      expect(service.snapshot).toBe('unsupported');
      expect(service.isSupported).toBeFalse();
    } finally {
      if (original) {
        Object.defineProperty(window, 'Notification', original);
      }
    }
  });

  it('requests permission and reflects the granted state', async () => {
    const requestPermission = installNotification('default', 'granted');

    const result = await service.request();

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(result).toBe('granted');
    expect(service.snapshot).toBe('granted');
    expect(await firstValueFrom(service.permission$)).toBe('granted');
  });

  it('does not prompt again once permission was granted', async () => {
    installNotification('granted');
    service.refresh();

    const result = await service.request();

    expect(result).toBe('granted');
  });

  it('propagates denied decisions from the request flow', async () => {
    installNotification('default', 'denied');

    const result = await service.request();

    expect(result).toBe('denied');
    expect(service.snapshot).toBe('denied');
  });

  it('shows notifications only when permission was granted', () => {
    installNotification('denied');
    service.refresh();

    expect(service.show('title')).toBeFalse();

    installNotification('granted');
    service.refresh();

    expect(service.show('title', { body: 'test' })).toBeTrue();
  });
});
