import { InjectionToken } from '@angular/core';

import packageMetadataJson from '../../../../package.json' assert { type: 'json' };
import { PackageMetadata } from '../interfaces/package-metadata.interface';

const UNKNOWN_VERSION = '0.0.0' as const;
const PACKAGE_METADATA = packageMetadataJson as PackageMetadata;
const FALLBACK_VERSION = normalizeVersion(PACKAGE_METADATA.version);
const APP_VERSION_VALUE = resolveVersion(FALLBACK_VERSION);

export const APP_VERSION = new InjectionToken<string>('APP_VERSION', {
  providedIn: 'root',
  factory: () => APP_VERSION_VALUE
});

function resolveVersion(fallbackVersion: string): string {
  const environmentVersion = readVersionFromEnvironment();
  return environmentVersion ?? fallbackVersion;
}

function readVersionFromEnvironment(): string | null {
  const candidate = import.meta.env?.NG_APP_VERSION;
  if (typeof candidate !== 'string') {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.length > 0 ? trimmed : UNKNOWN_VERSION;
}
