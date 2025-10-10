import { InjectionToken } from '@angular/core';

import packageMetadata from '../../../../package.json' assert { type: 'json' };

const APP_VERSION_TOKEN_DESCRIPTION = 'APP_VERSION';
const APP_VERSION_ENVIRONMENT_KEY = 'NG_APP_VERSION' as const;

type VersionHost = typeof globalThis & { readonly NG_APP_VERSION?: string };

const resolveVersion = (): string => {
  const host = globalThis as VersionHost;
  const environmentVersion = host[APP_VERSION_ENVIRONMENT_KEY];

  return environmentVersion ?? packageMetadata.version;
};

export const APP_VERSION_TOKEN = new InjectionToken<string>(APP_VERSION_TOKEN_DESCRIPTION, {
  factory: resolveVersion
});
