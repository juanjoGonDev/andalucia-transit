const URL_SLUG_WORD_SEPARATOR = '-' as const;
const URL_SLUG_MAX_LENGTH = 120;

export function buildDescriptiveSlug(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, URL_SLUG_WORD_SEPARATOR)
    .replace(new RegExp(`${URL_SLUG_WORD_SEPARATOR}{2,}`, 'g'), URL_SLUG_WORD_SEPARATOR)
    .replace(
      new RegExp(`^${URL_SLUG_WORD_SEPARATOR}|${URL_SLUG_WORD_SEPARATOR}$`, 'g'),
      ''
    );

  const truncated = normalized.slice(0, URL_SLUG_MAX_LENGTH);
  const trimmed = truncated.replace(new RegExp(`${URL_SLUG_WORD_SEPARATOR}+$`, 'g'), '');
  return trimmed || fallback;
}
