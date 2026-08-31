import {
  STORAGE_NOTICE_DISMISSED_VALUE,
  STORAGE_NOTICE_STORAGE_KEY,
  StorageNoticeStateService
} from './storage-notice-state.service';

describe('StorageNoticeStateService', () => {
  let service: StorageNoticeStateService;

  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_NOTICE_STORAGE_KEY);
    service = new StorageNoticeStateService();
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_NOTICE_STORAGE_KEY);
  });

  it('starts visible when no dismissal preference exists', () => {
    expect(service.isDismissed()).toBeFalse();
  });

  it('persists dismissal as functional local state', () => {
    service.dismiss();

    expect(service.isDismissed()).toBeTrue();
    expect(window.localStorage.getItem(STORAGE_NOTICE_STORAGE_KEY)).toBe(
      STORAGE_NOTICE_DISMISSED_VALUE
    );
  });

  it('does not treat unrelated stored values as a dismissal', () => {
    window.localStorage.setItem(STORAGE_NOTICE_STORAGE_KEY, 'other');

    expect(service.isDismissed()).toBeFalse();
  });
});
