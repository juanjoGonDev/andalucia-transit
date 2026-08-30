import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { AppLayoutComponent } from '@shared/layout/app-layout/app-layout.component';
import { AppShellTopActionsComponent } from '@shared/layout/top-actions/app-shell-top-actions.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'layout.skipToContent': 'Skip to main content'
    });
  }
}

@Component({
  selector: 'app-app-shell-top-actions',
  standalone: true,
  template: ''
})
class AppShellTopActionsStubComponent {}

interface AppLayoutComponentAccess {
  readonly mainContentId: string;
  focusMainContent(): void;
}

class IntersectionObserverStub implements IntersectionObserver {
  static latest: IntersectionObserverStub | null = null;

  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  private target: Element | null = null;

  constructor(private readonly callback: IntersectionObserverCallback) {
    IntersectionObserverStub.latest = this;
  }

  disconnect(): void {
    this.target = null;
  }

  observe(target: Element): void {
    this.target = target;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(target: Element): void {
    if (this.target === target) {
      this.target = null;
    }
  }

  emit(isIntersecting: boolean): void {
    const target = this.target;

    if (!target) {
      throw new Error('IntersectionObserver target is not registered.');
    }

    const bounds = target.getBoundingClientRect();
    const intersectionRect = isIntersecting ? bounds : new DOMRect();
    const entry = {
      boundingClientRect: bounds,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect,
      isIntersecting,
      rootBounds: null,
      target,
      time: 0
    } as IntersectionObserverEntry;

    this.callback([entry], this);
  }
}

class ResizeObserverStub implements ResizeObserver {
  static latest: ResizeObserverStub | null = null;
  private readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.latest = this;
  }

  disconnect(): void {
    this.targets.clear();
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  emit(target: Element): void {
    if (!this.targets.has(target)) {
      throw new Error('ResizeObserver target is not registered.');
    }

    const entry = {
      borderBoxSize: [],
      contentBoxSize: [],
      contentRect: target.getBoundingClientRect(),
      devicePixelContentBoxSize: [],
      target
    } as unknown as ResizeObserverEntry;

    this.callback([entry], this);
  }
}

const MAIN_ROLE = 'main';
const FOOTER_CLEARANCE_PROPERTY = '--app-shell-footer-visible-height';
const STORAGE_NOTICE_HEIGHT_PROPERTY = '--app-shell-storage-notice-height';
const INITIAL_FOOTER_HEIGHT = 72;
const RESIZED_FOOTER_HEIGHT = 96;
const STORAGE_NOTICE_HEIGHT = 148;

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(async () => {
    originalIntersectionObserver = window.IntersectionObserver;
    originalResizeObserver = window.ResizeObserver;
    IntersectionObserverStub.latest = null;
    ResizeObserverStub.latest = null;
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: IntersectionObserverStub
    });
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub
    });

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AppLayoutComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ]
    })
      .overrideComponent(AppLayoutComponent, {
        remove: { imports: [AppShellTopActionsComponent] },
        add: { imports: [AppShellTopActionsStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: originalIntersectionObserver
    });
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: originalResizeObserver
    });
  });

  it('links the skip control to the main content fragment', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const control = fixture.nativeElement.querySelector('.app-shell__skip-button') as HTMLAnchorElement | null;

    expect(control).not.toBeNull();
    expect(control?.getAttribute('href')).toBe(`#${access.mainContentId}`);
  });

  it('exposes the main landmark for routed content', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const element = fixture.nativeElement.querySelector(`#${access.mainContentId}`) as HTMLElement | null;

    expect(element).not.toBeNull();
    expect(element?.getAttribute('role')).toBe(MAIN_ROLE);
  });

  it('focuses the main content when the skip control is activated', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const element = fixture.nativeElement.querySelector(`#${access.mainContentId}`) as HTMLElement | null;

    expect(element).not.toBeNull();

    const target = element as HTMLElement;

    document.body.focus();
    access.focusMainContent();

    expect(document.activeElement).toBe(target);
  });

  it('ignores focus requests when the main content element is not present', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const element = fixture.nativeElement.querySelector(`#${access.mainContentId}`) as HTMLElement | null;

    element?.remove();

    expect(() => access.focusMainContent()).not.toThrow();
  });

  it('publishes footer clearance only while the legal footer intersects the viewport', () => {
    const footer = fixture.nativeElement.querySelector('.legal-footer') as HTMLElement | null;
    const intersectionObserver = IntersectionObserverStub.latest;

    expect(footer).not.toBeNull();
    expect(intersectionObserver).not.toBeNull();

    if (!footer || !intersectionObserver) {
      return;
    }

    spyOn(footer, 'getBoundingClientRect').and.returnValue(
      new DOMRect(0, 0, 390, INITIAL_FOOTER_HEIGHT)
    );

    intersectionObserver.emit(true);
    expect(fixture.nativeElement.style.getPropertyValue(FOOTER_CLEARANCE_PROPERTY)).toBe(
      `${INITIAL_FOOTER_HEIGHT}px`
    );

    intersectionObserver.emit(false);
    expect(fixture.nativeElement.style.getPropertyValue(FOOTER_CLEARANCE_PROPERTY)).toBe('0px');
  });

  it('refreshes visible footer clearance when responsive footer height changes', () => {
    const footer = fixture.nativeElement.querySelector('.legal-footer') as HTMLElement | null;
    const intersectionObserver = IntersectionObserverStub.latest;
    const resizeObserver = ResizeObserverStub.latest;

    expect(footer).not.toBeNull();
    expect(intersectionObserver).not.toBeNull();
    expect(resizeObserver).not.toBeNull();

    if (!footer || !intersectionObserver || !resizeObserver) {
      return;
    }

    const bounds = spyOn(footer, 'getBoundingClientRect').and.returnValue(
      new DOMRect(0, 0, 390, INITIAL_FOOTER_HEIGHT)
    );

    intersectionObserver.emit(true);
    expect(fixture.nativeElement.style.getPropertyValue(FOOTER_CLEARANCE_PROPERTY)).toBe(
      `${INITIAL_FOOTER_HEIGHT}px`
    );

    bounds.and.returnValue(new DOMRect(0, 0, 390, RESIZED_FOOTER_HEIGHT));
    resizeObserver.emit(footer);
    expect(fixture.nativeElement.style.getPropertyValue(FOOTER_CLEARANCE_PROPERTY)).toBe(
      `${RESIZED_FOOTER_HEIGHT}px`
    );
  });

  it('publishes the rendered storage notice height and clears it after dismissal', () => {
    const noticeHost = fixture.nativeElement.querySelector('app-storage-notice') as HTMLElement | null;
    const resizeObserver = ResizeObserverStub.latest;

    expect(noticeHost).not.toBeNull();
    expect(resizeObserver).not.toBeNull();

    if (!noticeHost || !resizeObserver) {
      return;
    }

    const bounds = spyOn(noticeHost, 'getBoundingClientRect').and.returnValue(
      new DOMRect(0, 0, 390, STORAGE_NOTICE_HEIGHT)
    );

    resizeObserver.emit(noticeHost);
    expect(fixture.nativeElement.style.getPropertyValue(STORAGE_NOTICE_HEIGHT_PROPERTY)).toBe(
      `${STORAGE_NOTICE_HEIGHT}px`
    );

    bounds.and.returnValue(new DOMRect(0, 0, 390, 0));
    resizeObserver.emit(noticeHost);
    expect(fixture.nativeElement.style.getPropertyValue(STORAGE_NOTICE_HEIGHT_PROPERTY)).toBe('0px');
  });
});
