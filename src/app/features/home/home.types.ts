export const HOME_TABS = ['search', 'recent', 'favorites'] as const;

export type HomeTabId = (typeof HOME_TABS)[number];
