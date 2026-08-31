import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { APP_LAYOUT_CONTEXT } from '@shared/layout/app-layout-context.token';
import { AppShellTopActionsComponent } from '@shared/layout/top-actions/app-shell-top-actions.component';
import { LegalFooterComponent } from '@shared/privacy/legal-footer.component';
import { StorageNoticeComponent } from '@shared/privacy/storage-notice.component';

const MAIN_CONTENT_ID = 'app-main-content';
const SKIP_LINK_LABEL_KEY = 'layout.skipToContent';
const FRAGMENT_PREFIX = '#';
const MAIN_ROLE = 'main';
const LEGAL_FOOTER_SELECTOR = '.legal-footer';
const STORAGE_NOTICE_HOST_SELECTOR = 'app-storage-notice';
const FOOTER_VISIBLE_HEIGHT_PROPERTY = '--app-shell-footer-visible-height';
const STORAGE_NOTICE_HEIGHT_PROPERTY = '--app-shell-storage-notice-height';
const FOOTER_INTERSECTION_THRESHOLD = 0.01;
const ZERO_HEIGHT = '0px';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [
    AppShellTopActionsComponent,
    RouterOutlet,
    TranslateModule,
    AccessibleButtonDirective,
    LegalFooterComponent,
    StorageNoticeComponent
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AppLayoutContextStore,
    {
      provide: APP_LAYOUT_CONTEXT,
      useExisting: AppLayoutContextStore
    }
  ],
  host: {
    class: 'app-shell'
  }
})
export class AppLayoutComponent implements AfterViewInit, OnDestroy {
  private readonly contextStore = inject(AppLayoutContextStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef<HTMLElement>);
  private footerElement: HTMLElement | null = null;
  private storageNoticeElement: HTMLElement | null = null;
  private footerIsVisible = false;
  private footerIntersectionObserver: IntersectionObserver | null = null;
  private shellResizeObserver: ResizeObserver | null = null;

  @ViewChild('mainContent', { static: true }) private readonly mainContent?: ElementRef<HTMLElement>;
  protected readonly mainContentId = MAIN_CONTENT_ID;
  protected readonly skipLinkLabelKey = SKIP_LINK_LABEL_KEY;
  protected readonly mainContentRole = MAIN_ROLE;

  ngAfterViewInit(): void {
    this.observeShellGeometry();
  }

  ngOnDestroy(): void {
    this.footerIntersectionObserver?.disconnect();
    this.shellResizeObserver?.disconnect();
    this.host.nativeElement.style.removeProperty(FOOTER_VISIBLE_HEIGHT_PROPERTY);
    this.host.nativeElement.style.removeProperty(STORAGE_NOTICE_HEIGHT_PROPERTY);
  }

  protected get mainContentFragment(): string {
    return `${FRAGMENT_PREFIX}${this.mainContentId}`;
  }

  protected focusMainContent(): void {
    const element = this.mainContent?.nativeElement ?? null;

    if (!element || !element.isConnected) {
      return;
    }

    element.focus({ preventScroll: false });
  }

  private observeShellGeometry(): void {
    const host = this.host.nativeElement;
    const footer = host.querySelector<HTMLElement>(LEGAL_FOOTER_SELECTOR);
    const storageNotice = host.querySelector<HTMLElement>(STORAGE_NOTICE_HOST_SELECTOR);

    this.footerElement = footer;
    this.storageNoticeElement = storageNotice;
    this.setShellHeight(FOOTER_VISIBLE_HEIGHT_PROPERTY, 0);
    this.refreshStorageNoticeHeight();

    if (footer && typeof globalThis.IntersectionObserver === 'function') {
      this.footerIntersectionObserver = new IntersectionObserver(
        (entries) => this.handleFooterIntersection(entries),
        { threshold: FOOTER_INTERSECTION_THRESHOLD }
      );
      this.footerIntersectionObserver.observe(footer);
    }

    if (typeof globalThis.ResizeObserver !== 'function') {
      return;
    }

    this.shellResizeObserver = new ResizeObserver((entries) => this.handleShellResize(entries));

    if (footer) {
      this.shellResizeObserver.observe(footer);
    }

    if (storageNotice) {
      this.shellResizeObserver.observe(storageNotice);
    }
  }

  private handleFooterIntersection(entries: readonly IntersectionObserverEntry[]): void {
    const footer = this.footerElement;

    if (!footer) {
      return;
    }

    const footerEntry = entries.find((entry) => entry.target === footer);

    if (!footerEntry) {
      return;
    }

    this.footerIsVisible = footerEntry.isIntersecting;
    this.refreshFooterClearance();
  }

  private handleShellResize(entries: readonly ResizeObserverEntry[]): void {
    const resizedElements = new Set(entries.map((entry) => entry.target));
    const footer = this.footerElement;
    const storageNotice = this.storageNoticeElement;

    if (footer && resizedElements.has(footer)) {
      this.refreshFooterClearance();
    }

    if (storageNotice && resizedElements.has(storageNotice)) {
      this.refreshStorageNoticeHeight();
    }
  }

  private refreshFooterClearance(): void {
    const footer = this.footerElement;

    if (!footer || !this.footerIsVisible) {
      this.setShellHeight(FOOTER_VISIBLE_HEIGHT_PROPERTY, 0);
      return;
    }

    this.setShellHeight(
      FOOTER_VISIBLE_HEIGHT_PROPERTY,
      Math.ceil(footer.getBoundingClientRect().height)
    );
  }

  private refreshStorageNoticeHeight(): void {
    const storageNotice = this.storageNoticeElement;
    const height = storageNotice ? Math.ceil(storageNotice.getBoundingClientRect().height) : 0;

    this.setShellHeight(STORAGE_NOTICE_HEIGHT_PROPERTY, height);
  }

  private setShellHeight(property: string, height: number): void {
    const value = height > 0 ? `${height}px` : ZERO_HEIGHT;
    this.host.nativeElement.style.setProperty(property, value);
  }
}
