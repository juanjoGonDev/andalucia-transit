import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jasmine.clock().uninstall();
    jasmine.clock().install();
    service = new ToastService();
  });

  afterEach(() => {
    service.clear();
    jasmine.clock().uninstall();
  });

  it('shows a toast with translated title, body and default lifetime', () => {
    const id = service.show({
      icon: 'notifications',
      titleKey: 'alarms.toastTitle',
      titleParams: { lineCode: 'M-370' },
      bodyKey: 'alarms.toastBody',
      bodyParams: { time: '11:20' }
    });

    const toast = service.toasts().find((entry) => entry.id === id);
    expect(toast).toBeDefined();
    expect(toast?.durationMs).toBe(6_000);
  });

  it('auto-dismisses entries after their duration', () => {
    service.show({ icon: 'notifications', titleKey: 'x', durationMs: 2_000 });
    expect(service.toasts().length).toBe(1);

    jasmine.clock().tick(2_001);
    expect(service.toasts().length).toBe(0);
  });

  it('keeps only the newest visible entries', () => {
    for (let index = 0; index < 5; index++) {
      service.show({ icon: 'notifications', titleKey: `t${index}` });
    }

    expect(service.toasts().length).toBe(3);
    expect(service.toasts()[0]?.titleKey).toBe('t4');
    expect(service.toasts()[2]?.titleKey).toBe('t2');
  });

  it('dismisses entries on demand cancelling their timer', () => {
    const id = service.show({ icon: 'notifications', titleKey: 'x' });
    service.dismiss(id);

    expect(service.toasts()).toEqual([]);
    jasmine.clock().tick(60_000);
    expect(service.toasts()).toEqual([]);
  });
});
