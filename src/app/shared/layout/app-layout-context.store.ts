import { Injectable, Signal, computed, signal } from '@angular/core';
import {
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext,
  AppLayoutContextSnapshot,
  AppLayoutFooterVisibility,
  AppLayoutNavigationKey,
  AppLayoutSurface,
  AppLayoutTabIdentifier,
  AppLayoutTabRegistration
} from '@shared/layout/app-layout-context.token';

const DEFAULT_FOOTER_VISIBILITY: AppLayoutFooterVisibility = 'visible';

@Injectable()
export class AppLayoutContextStore implements AppLayoutContext {
  private readonly activeContent = signal<AppLayoutContentIdentifier | null>(null);
  private readonly tabs = signal<readonly AppLayoutTabRegistration[]>([]);
  private readonly activeTab = signal<AppLayoutTabIdentifier | null>(null);
  private readonly navigationKeys = signal<
    ReadonlyMap<AppLayoutContentIdentifier, AppLayoutNavigationKey | null>
  >(new Map());
  private readonly surfaces = signal<ReadonlyMap<AppLayoutContentIdentifier, AppLayoutSurface>>(
    new Map()
  );
  private readonly footerVisibilities = signal<
    ReadonlyMap<AppLayoutContentIdentifier, AppLayoutFooterVisibility>
  >(new Map());

  private readonly currentSnapshot: Signal<AppLayoutContextSnapshot> = computed(() => ({
    activeContent: this.activeContent(),
    activeNavigationKey: this.resolveActiveNavigationKey(),
    activeSurface: this.resolveActiveSurface(),
    activeFooterVisibility: this.resolveActiveFooterVisibility(),
    tabs: this.tabs(),
    activeTab: this.activeTab()
  }));

  registerContent(registration: AppLayoutContentRegistration): void {
    const nextNavigation = new Map(this.navigationKeys());
    const navigationKey = registration.navigationKey ?? null;
    nextNavigation.set(registration.identifier, navigationKey);
    this.navigationKeys.set(nextNavigation);

    const nextSurfaces = new Map(this.surfaces());
    nextSurfaces.set(registration.identifier, registration.surface);
    this.surfaces.set(nextSurfaces);

    const nextFooterVisibilities = new Map(this.footerVisibilities());
    nextFooterVisibilities.set(
      registration.identifier,
      registration.footerVisibility ?? DEFAULT_FOOTER_VISIBILITY
    );
    this.footerVisibilities.set(nextFooterVisibilities);

    this.activeContent.set(registration.identifier);
  }

  unregisterContent(identifier: AppLayoutContentIdentifier): void {
    const nextNavigation = new Map(this.navigationKeys());
    nextNavigation.delete(identifier);
    this.navigationKeys.set(nextNavigation);

    const nextSurfaces = new Map(this.surfaces());
    nextSurfaces.delete(identifier);
    this.surfaces.set(nextSurfaces);

    const nextFooterVisibilities = new Map(this.footerVisibilities());
    nextFooterVisibilities.delete(identifier);
    this.footerVisibilities.set(nextFooterVisibilities);

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

  private resolveActiveNavigationKey(): AppLayoutNavigationKey | null {
    const activeIdentifier = this.activeContent();

    if (!activeIdentifier) {
      return null;
    }

    return this.navigationKeys().get(activeIdentifier) ?? null;
  }

  private resolveActiveSurface(): AppLayoutSurface | null {
    const activeIdentifier = this.activeContent();

    if (!activeIdentifier) {
      return null;
    }

    return this.surfaces().get(activeIdentifier) ?? null;
  }

  private resolveActiveFooterVisibility(): AppLayoutFooterVisibility | null {
    const activeIdentifier = this.activeContent();

    if (!activeIdentifier) {
      return null;
    }

    return this.footerVisibilities().get(activeIdentifier) ?? DEFAULT_FOOTER_VISIBILITY;
  }
}
