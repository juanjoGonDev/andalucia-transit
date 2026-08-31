const CTAN_MISSING_NUCLEUS = 'NN' as const;
const STOP_METADATA_LOCALE = 'es-ES' as const;

export function normalizeStopNucleus(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return null;
  }

  return normalized.toLocaleUpperCase(STOP_METADATA_LOCALE) === CTAN_MISSING_NUCLEUS
    ? null
    : normalized;
}
