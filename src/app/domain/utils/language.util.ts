export const normalizeLanguage = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.toLowerCase();
};

export const resolveLanguage = (
  supported: readonly string[],
  fallback: string,
  navigatorLanguage: string | null | undefined,
): string => {
  const normalizedFallback = normalizeLanguage(fallback) ?? fallback;
  const supportedNormalized = supported.map((item) => normalizeLanguage(item) ?? item);
  const normalizedNavigator = normalizeLanguage(navigatorLanguage);

  if (normalizedNavigator && supportedNormalized.includes(normalizedNavigator)) {
    return supported[supportedNormalized.indexOf(normalizedNavigator)];
  }

  if (normalizedNavigator) {
    const shortCode = normalizedNavigator.split('-')[0];
    const partialMatchIndex = supportedNormalized.findIndex((item) => item === shortCode);
    if (partialMatchIndex >= 0) {
      return supported[partialMatchIndex];
    }
  }

  return supported[supportedNormalized.indexOf(normalizedFallback)] ?? fallback;
};
