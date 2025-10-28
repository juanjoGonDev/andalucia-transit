import { Injectable, Signal, computed, signal } from '@angular/core';
import {
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext,
  AppLayoutContextSnapshot,
  AppLayoutNavigationKey,
  AppLayoutTabIdentifier,
  AppLayoutTabRegistration
} from '@shared/layout/app-layout-context.token';

@Injectable()
export class AppLayoutContextStore implements AppLayoutContext {
  private readonly activeContent = signal<AppLayoutContentIdentifier | null>(null);
  private readonly tabs = signal<readonly AppLayoutTabRegistration[]>([]);
  private readonly activeTab = signal<AppLayoutTabIdentifier | null>(null);
  private readonly navigationKeys = signal<
    ReadonlyMap<AppLayoutContentIdentifier, AppLayoutNavigationKey | null>
  >(new Map());
  private focusMainContentHandler: (() => void) | null = null;

  private readonly currentSnapshot: Signal<AppLayoutContextSnapshot> = computed(() => ({
    activeContent: this.activeContent(),
    activeNavigationKey: this.resolveActiveNavigationKey(),
    tabs: this.tabs(),
    activeTab: this.activeTab()
  }));

  registerContent(registration: AppLayoutContentRegistration): void {
    const nextNavigation = new Map(this.navigationKeys());
    const navigationKey = registration.navigationKey ?? null;
    nextNavigation.set(registration.identifier, navigationKey);
    this.navigationKeys.set(nextNavigation);
    this.activeContent.set(registration.identifier);
  }

  unregisterContent(identifier: AppLayoutContentIdentifier): void {
    const nextNavigation = new Map(this.navigationKeys());
    nextNavigation.delete(identifier);
    this.navigationKeys.set(nextNavigation);

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

  setFocusMainContentHandler(handler: () => void): void {
    this.focusMainContentHandler = handler;
  }

  clearFocusMainContentHandler(): void {
    this.focusMainContentHandler = null;
  }

  focusMainContent(): void {
    if (!this.focusMainContentHandler) {
      return;
    }

    this.focusMainContentHandler();
  }

  snapshot(): AppLayoutContextSnapshot {
    return this.currentSnapshot();
  }

  private resolveActiveNavigationKey(): AppLayoutNavigationKey | null {
    const activeIdentifier = this.activeContent();

    if (!activeIdentifier) {
      return null;
    }

    return this.navigationKeys().get(activeIdentifier) ?? null;
  }
}
