const TERMINAL_NUCLEUS_SENTINEL_PATTERN = /(?:^|\s)NN\s*$/i;

export function normalizeLineDisplayName(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(TERMINAL_NUCLEUS_SENTINEL_PATTERN, '').trimEnd();
}
