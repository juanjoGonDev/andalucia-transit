import { InjectionToken } from '@angular/core';

const APP_LAYOUT_CONTEXT_TOKEN_DESCRIPTION = 'app-layout-context';

export type AppLayoutContentIdentifier = symbol;

export interface AppLayoutContentRegistration {
  readonly identifier: AppLayoutContentIdentifier;
}

export type AppLayoutTabIdentifier = string;

export interface AppLayoutTabRegistration {
  readonly identifier: AppLayoutTabIdentifier;
  readonly labelKey: string;
}

export interface AppLayoutContextSnapshot {
  readonly activeContent: AppLayoutContentIdentifier | null;
  readonly tabs: readonly AppLayoutTabRegistration[];
  readonly activeTab: AppLayoutTabIdentifier | null;
}

export interface AppLayoutContext {
  readonly registerContent: (registration: AppLayoutContentRegistration) => void;
  readonly unregisterContent: (identifier: AppLayoutContentIdentifier) => void;
  readonly configureTabs: (tabs: readonly AppLayoutTabRegistration[]) => void;
  readonly setActiveTab: (identifier: AppLayoutTabIdentifier) => void;
  readonly clearTabs: () => void;
  readonly snapshot: () => AppLayoutContextSnapshot;
}

const createNoopAppLayoutContext = (): AppLayoutContext => {
  const emptySnapshot: AppLayoutContextSnapshot = {
    activeContent: null,
    tabs: [],
    activeTab: null
  };

  return {
    registerContent: (registration: AppLayoutContentRegistration) => {
      void registration;
    },
    unregisterContent: (identifier: AppLayoutContentIdentifier) => {
      void identifier;
    },
    configureTabs: (tabs: readonly AppLayoutTabRegistration[]) => {
      void tabs;
    },
    setActiveTab: (identifier: AppLayoutTabIdentifier) => {
      void identifier;
    },
    clearTabs: () => {
      return;
    },
    snapshot: () => emptySnapshot
  };
};

export const APP_LAYOUT_CONTEXT = new InjectionToken<AppLayoutContext>(
  APP_LAYOUT_CONTEXT_TOKEN_DESCRIPTION,
  {
    factory: createNoopAppLayoutContext
  }
);
