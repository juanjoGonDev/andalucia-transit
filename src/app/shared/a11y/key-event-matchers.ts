export type LegacyKeyboardEvent = KeyboardEvent & { readonly keyIdentifier?: string | null };

export interface KeyMatcherDefinition {
  readonly keyValues?: readonly string[];
  readonly codeValues?: readonly string[];
  readonly keyCodes?: readonly number[];
  readonly keyIdentifiers?: readonly string[];
}

export interface KeyMatcher {
  readonly keyValues?: ReadonlySet<string>;
  readonly codeValues?: ReadonlySet<string>;
  readonly keyCodes?: ReadonlySet<number>;
  readonly keyIdentifiers?: ReadonlySet<string>;
}

const MINIMUM_KEY_CODE = 1;

export const createKeyMatcher = (definition: KeyMatcherDefinition): KeyMatcher => ({
  keyValues: definition.keyValues ? new Set(definition.keyValues) : undefined,
  codeValues: definition.codeValues ? new Set(definition.codeValues) : undefined,
  keyCodes: definition.keyCodes ? new Set(definition.keyCodes) : undefined,
  keyIdentifiers: definition.keyIdentifiers
    ? new Set(definition.keyIdentifiers)
    : undefined
});

export const matchesKey = (event: KeyboardEvent, matcher: KeyMatcher): boolean => {
  if (matcher.keyValues && event.key && matcher.keyValues.has(event.key)) {
    return true;
  }

  if (matcher.codeValues && event.code && matcher.codeValues.has(event.code)) {
    return true;
  }

  if (matcher.keyCodes) {
    const keyCode = resolveKeyCode(event);

    if (keyCode !== null && matcher.keyCodes.has(keyCode)) {
      return true;
    }
  }

  if (matcher.keyIdentifiers) {
    const legacyEvent = event as LegacyKeyboardEvent;

    if (
      typeof legacyEvent.keyIdentifier === 'string' &&
      matcher.keyIdentifiers.has(legacyEvent.keyIdentifier)
    ) {
      return true;
    }
  }

  return false;
};

const resolveKeyCode = (event: KeyboardEvent): number | null => {
  if (typeof event.keyCode === 'number' && event.keyCode >= MINIMUM_KEY_CODE) {
    return event.keyCode;
  }

  if (typeof event.which === 'number' && event.which >= MINIMUM_KEY_CODE) {
    return event.which;
  }

  return null;
};
