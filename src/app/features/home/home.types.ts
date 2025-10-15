export const HOME_TABS = ['search', 'recent', 'favorites', 'nearby', 'settings'] as const;

export type HomeTabId = (typeof HOME_TABS)[number];

export const isHomeTabId = (value: string | null): value is HomeTabId => {
  return HOME_TABS.includes((value ?? '') as HomeTabId);
};
