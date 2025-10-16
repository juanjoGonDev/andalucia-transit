import { Injectable, Signal, computed, signal } from '@angular/core';

import {
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext,
  AppLayoutContextSnapshot,
  AppLayoutTabIdentifier,
  AppLayoutTabRegistration
} from './app-layout-context.token';

@Injectable()
export class AppLayoutContextStore implements AppLayoutContext {
  private readonly activeContent = signal<AppLayoutContentIdentifier | null>(null);
  private readonly tabs = signal<readonly AppLayoutTabRegistration[]>([]);
  private readonly activeTab = signal<AppLayoutTabIdentifier | null>(null);

  private readonly currentSnapshot: Signal<AppLayoutContextSnapshot> = computed(() => ({
    activeContent: this.activeContent(),
    tabs: this.tabs(),
    activeTab: this.activeTab()
  }));

  registerContent(registration: AppLayoutContentRegistration): void {
    this.activeContent.set(registration.identifier);
  }

  unregisterContent(identifier: AppLayoutContentIdentifier): void {
    if (this.activeContent() !== identifier) {
      return;
    }

    this.activeContent.set(null);
  }

  configureTabs(tabs: readonly AppLayoutTabRegistration[]): void {
    this.tabs.set(tabs);

    if (tabs.length === 0) {
      this.activeTab.set(null);
      return;
    }

    const currentActive = this.activeTab();

    if (currentActive && tabs.some((tab) => tab.identifier === currentActive)) {
      return;
    }

    const firstTab = tabs[0];
    this.activeTab.set(firstTab.identifier);
  }

  setActiveTab(identifier: AppLayoutTabIdentifier): void {
    if (!this.tabs().some((tab) => tab.identifier === identifier)) {
      return;
    }

    this.activeTab.set(identifier);
  }

  clearTabs(): void {
    this.tabs.set([]);
    this.activeTab.set(null);
  }

  snapshot(): AppLayoutContextSnapshot {
    return this.currentSnapshot();
  }
}
