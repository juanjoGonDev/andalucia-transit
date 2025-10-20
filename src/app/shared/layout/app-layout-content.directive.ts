import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  APP_LAYOUT_CONTEXT,
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext,
  AppLayoutNavigationKey
} from './app-layout-context.token';

const APP_LAYOUT_CONTENT_IDENTIFIER_DESCRIPTION = 'app-layout-content';

@Directive({
  selector: '[appLayoutContent]',
  standalone: true
})
export class AppLayoutContentDirective implements OnInit, OnDestroy, OnChanges {
  private readonly context: AppLayoutContext = inject(APP_LAYOUT_CONTEXT);
  private readonly identifier: AppLayoutContentIdentifier = Symbol(
    APP_LAYOUT_CONTENT_IDENTIFIER_DESCRIPTION
  );
  @Input({ alias: 'appLayoutContentNavigationKey' })
  navigationKey: AppLayoutNavigationKey | null = null;

  ngOnInit(): void {
    this.registerContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
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
}
