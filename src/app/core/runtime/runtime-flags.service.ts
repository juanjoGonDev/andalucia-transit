import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

export type MockDataMode = 'data' | 'empty' | null;

interface RuntimeFlagsDefinition {
  readonly forceSnapshot?: boolean;
  readonly mockDataMode?: MockDataMode;
}

@Injectable({ providedIn: 'root' })
export class RuntimeFlagsService {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly flags: RuntimeFlagsDefinition = readRuntimeFlags(this.config.runtime.flagsProperty);

  shouldForceSnapshot(): boolean {
    return this.flags.forceSnapshot === true;
  }

  mockDataMode(): MockDataMode {
    return this.flags.mockDataMode ?? null;
  }
}

function readRuntimeFlags(propertyKey: string): RuntimeFlagsDefinition {
  if (!propertyKey) {
    return {};
  }

  const globalObject = globalThis as Record<string, unknown>;
  const rawFlags = globalObject[propertyKey];

  if (typeof rawFlags !== 'object' || rawFlags === null) {
    return {};
  }

  const forceSnapshot = (rawFlags as RuntimeFlagsDefinition).forceSnapshot === true;
  const mockDataMode = normalizeMockDataMode((rawFlags as RuntimeFlagsDefinition).mockDataMode);

  return { forceSnapshot, mockDataMode } satisfies RuntimeFlagsDefinition;
}

function normalizeMockDataMode(mode: MockDataMode | undefined): MockDataMode {
  if (mode === 'data' || mode === 'empty') {
    return mode;
  }

  return null;
}
