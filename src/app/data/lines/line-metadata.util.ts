const TERMINAL_NUCLEUS_SENTINEL_PATTERN = /(?:^|\s)NN\s*$/i;

export function normalizeLineDisplayName(value: string): string {
  return value.trim().replace(TERMINAL_NUCLEUS_SENTINEL_PATTERN, '').trimEnd();
}
