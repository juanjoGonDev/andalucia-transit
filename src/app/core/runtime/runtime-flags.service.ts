import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

interface RuntimeFlagsDefinition {
  readonly forceSnapshot?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RuntimeFlagsService {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly flags: RuntimeFlagsDefinition = readRuntimeFlags(this.config.runtime.flagsProperty);

  shouldForceSnapshot(): boolean {
    return this.flags.forceSnapshot === true;
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

  return { forceSnapshot } satisfies RuntimeFlagsDefinition;
}
