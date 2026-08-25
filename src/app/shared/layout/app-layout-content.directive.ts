import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  APP_LAYOUT_CONTEXT,
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext,
  AppLayoutNavigationKey
} from '@shared/layout/app-layout-context.token';

const APP_LAYOUT_CONTENT_IDENTIFIER_DESCRIPTION = 'app-layout-content';
const APP_LAYOUT_SURFACE_CLASS = 'app-layout__surface';
const APP_LAYOUT_SURFACE_HERO_CLASS = 'app-layout__surface--hero';
const APP_LAYOUT_SURFACE_PLAIN_CLASS = 'app-layout__surface--plain';
type AppLayoutContentSurface = 'hero' | 'plain';

@Directive({
  selector: '[appLayoutContent]',
  standalone: true
})
export class AppLayoutContentDirective implements OnInit, OnDestroy, OnChanges {
  private readonly context: AppLayoutContext = inject(APP_LAYOUT_CONTEXT);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly identifier: AppLayoutContentIdentifier = Symbol(
    APP_LAYOUT_CONTENT_IDENTIFIER_DESCRIPTION
  );
  @Input({ alias: 'appLayoutContentNavigationKey' })
  navigationKey: AppLayoutNavigationKey | null = null;
  @Input({ alias: 'appLayoutContentSurface' })
  surface: AppLayoutContentSurface = 'hero';

  ngOnInit(): void {
    this.applySurfaceClasses();
    this.registerContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('surface' in changes) {
      this.applySurfaceClasses();
    }

    if (!('navigationKey' in changes)) {
      return;
    }

    const change = changes['navigationKey'];
    if (change.isFirstChange()) {
      return;
    }

    this.registerContent();
  }

  ngOnDestroy(): void {
    this.context.unregisterContent(this.identifier);
  }

  private registerContent(): void {
    const registration: AppLayoutContentRegistration = {
      identifier: this.identifier,
      navigationKey: this.navigationKey ?? null
    };

    this.context.registerContent(registration);
  }

  private applySurfaceClasses(): void {
    const hostElement = this.elementRef.nativeElement;
    const useHeroSurface = this.surface !== 'plain';

    this.renderer.addClass(hostElement, APP_LAYOUT_SURFACE_CLASS);

    if (useHeroSurface) {
      this.renderer.addClass(hostElement, APP_LAYOUT_SURFACE_HERO_CLASS);
      this.renderer.removeClass(hostElement, APP_LAYOUT_SURFACE_PLAIN_CLASS);
      return;
    }

    this.renderer.addClass(hostElement, APP_LAYOUT_SURFACE_PLAIN_CLASS);
    this.renderer.removeClass(hostElement, APP_LAYOUT_SURFACE_HERO_CLASS);
  }
}
