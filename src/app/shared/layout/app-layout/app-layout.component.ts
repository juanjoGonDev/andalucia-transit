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
const FOOTER_VISIBLE_HEIGHT_PROPERTY = '--app-shell-footer-visible-height';
const FOOTER_INTERSECTION_THRESHOLD = 0.01;
const ZERO_CLEARANCE = '0px';

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
  private footerIsVisible = false;
  private footerIntersectionObserver: IntersectionObserver | null = null;
  private footerResizeObserver: ResizeObserver | null = null;

  @ViewChild('mainContent', { static: true }) private readonly mainContent?: ElementRef<HTMLElement>;
  protected readonly mainContentId = MAIN_CONTENT_ID;
  protected readonly skipLinkLabelKey = SKIP_LINK_LABEL_KEY;
  protected readonly mainContentRole = MAIN_ROLE;

  ngAfterViewInit(): void {
    this.observeFooterClearance();
  }

  ngOnDestroy(): void {
    this.footerIntersectionObserver?.disconnect();
    this.footerResizeObserver?.disconnect();
    this.host.nativeElement.style.removeProperty(FOOTER_VISIBLE_HEIGHT_PROPERTY);
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

  private observeFooterClearance(): void {
    const footer = this.host.nativeElement.querySelector<HTMLElement>(LEGAL_FOOTER_SELECTOR);

    if (!footer) {
      return;
    }

    this.footerElement = footer;
    this.setFooterClearance(0);

    if (typeof globalThis.IntersectionObserver === 'function') {
      this.footerIntersectionObserver = new IntersectionObserver(
        (entries) => this.handleFooterIntersection(entries),
        { threshold: FOOTER_INTERSECTION_THRESHOLD }
      );
      this.footerIntersectionObserver.observe(footer);
    }

    if (typeof globalThis.ResizeObserver === 'function') {
      this.footerResizeObserver = new ResizeObserver(() => this.refreshFooterClearance());
      this.footerResizeObserver.observe(footer);
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

  private refreshFooterClearance(): void {
    const footer = this.footerElement;

    if (!footer || !this.footerIsVisible) {
      this.setFooterClearance(0);
      return;
    }

    this.setFooterClearance(Math.ceil(footer.getBoundingClientRect().height));
  }

  private setFooterClearance(height: number): void {
    const value = height > 0 ? `${height}px` : ZERO_CLEARANCE;
    this.host.nativeElement.style.setProperty(FOOTER_VISIBLE_HEIGHT_PROPERTY, value);
  }
}
