import { Directive, OnDestroy, OnInit, inject } from '@angular/core';

import {
  APP_LAYOUT_CONTEXT,
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext
} from './app-layout-context.token';

const APP_LAYOUT_CONTENT_IDENTIFIER_DESCRIPTION = 'app-layout-content';

@Directive({
  selector: '[appLayoutContent]',
  standalone: true
})
export class AppLayoutContentDirective implements OnInit, OnDestroy {
  private readonly context: AppLayoutContext = inject(APP_LAYOUT_CONTEXT);
  private readonly identifier: AppLayoutContentIdentifier = Symbol(
    APP_LAYOUT_CONTENT_IDENTIFIER_DESCRIPTION
  );

  ngOnInit(): void {
    const registration: AppLayoutContentRegistration = { identifier: this.identifier };
    this.context.registerContent(registration);
  }

  ngOnDestroy(): void {
    this.context.unregisterContent(this.identifier);
  }
}
