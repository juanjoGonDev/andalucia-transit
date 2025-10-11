const ROOT_SEGMENT = '/' as const;

export type NavigationCommands = readonly string[];

export const buildNavigationCommands = (path: string): NavigationCommands => {
  if (!path) {
    return [ROOT_SEGMENT];
  }

  return [ROOT_SEGMENT, path];
};
