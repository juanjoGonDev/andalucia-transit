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

const KEY_VALUE_ENTER = 'Enter' as const;
const KEY_VALUE_RETURN = 'Return' as const;
const KEY_VALUE_ESCAPE = 'Escape' as const;
const KEY_VALUE_ESC = 'Esc' as const;
const KEY_VALUE_SPACE = ' ' as const;
const KEY_VALUE_SPACE_NAME = 'Space' as const;
const KEY_VALUE_SPACEBAR = 'Spacebar' as const;
const KEY_VALUE_ARROW_LEFT = 'ArrowLeft' as const;
const KEY_VALUE_LEFT = 'Left' as const;
const KEY_VALUE_ARROW_RIGHT = 'ArrowRight' as const;
const KEY_VALUE_RIGHT = 'Right' as const;
const KEY_VALUE_ARROW_UP = 'ArrowUp' as const;
const KEY_VALUE_UP = 'Up' as const;
const KEY_VALUE_ARROW_DOWN = 'ArrowDown' as const;
const KEY_VALUE_DOWN = 'Down' as const;
const KEY_VALUE_HOME = 'Home' as const;
const KEY_VALUE_END = 'End' as const;
const KEY_CODE_ENTER = 13 as const;
const KEY_CODE_ESCAPE = 27 as const;
const KEY_CODE_SPACE = 32 as const;
const KEY_CODE_ARROW_LEFT = 37 as const;
const KEY_CODE_ARROW_UP = 38 as const;
const KEY_CODE_ARROW_RIGHT = 39 as const;
const KEY_CODE_ARROW_DOWN = 40 as const;
const KEY_CODE_HOME = 36 as const;
const KEY_CODE_END = 35 as const;
const KEY_CODE_NAME_ENTER = 'Enter' as const;
const KEY_CODE_NAME_ESCAPE = 'Escape' as const;
const KEY_CODE_NAME_SPACE = 'Space' as const;
const KEY_CODE_NAME_ARROW_LEFT = 'ArrowLeft' as const;
const KEY_CODE_NAME_ARROW_RIGHT = 'ArrowRight' as const;
const KEY_CODE_NAME_ARROW_UP = 'ArrowUp' as const;
const KEY_CODE_NAME_ARROW_DOWN = 'ArrowDown' as const;
const KEY_CODE_NAME_HOME = 'Home' as const;
const KEY_CODE_NAME_END = 'End' as const;
const KEY_IDENTIFIER_ENTER = 'Enter' as const;
const KEY_IDENTIFIER_ENTER_CODE = 'U+000D' as const;
const KEY_IDENTIFIER_ESCAPE = 'Escape' as const;
const KEY_IDENTIFIER_ESCAPE_CODE = 'U+001B' as const;
const KEY_IDENTIFIER_ESC = 'Esc' as const;
const KEY_IDENTIFIER_SPACE = 'U+0020' as const;
const KEY_IDENTIFIER_SPACEBAR = 'Spacebar' as const;
const KEY_IDENTIFIER_ARROW_LEFT = 'Left' as const;
const KEY_IDENTIFIER_ARROW_RIGHT = 'Right' as const;
const KEY_IDENTIFIER_ARROW_UP = 'Up' as const;
const KEY_IDENTIFIER_ARROW_DOWN = 'Down' as const;
const KEY_IDENTIFIER_HOME = 'Home' as const;
const KEY_IDENTIFIER_END = 'End' as const;

export const createKeyMatcher = (definition: KeyMatcherDefinition): KeyMatcher => ({
  keyValues: definition.keyValues ? new Set(definition.keyValues) : undefined,
  codeValues: definition.codeValues ? new Set(definition.codeValues) : undefined,
  keyCodes: definition.keyCodes ? new Set(definition.keyCodes) : undefined,
  keyIdentifiers: definition.keyIdentifiers ? new Set(definition.keyIdentifiers) : undefined
});

export const ENTER_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ENTER, KEY_VALUE_RETURN],
  codeValues: [KEY_CODE_NAME_ENTER],
  keyCodes: [KEY_CODE_ENTER],
  keyIdentifiers: [KEY_IDENTIFIER_ENTER, KEY_IDENTIFIER_ENTER_CODE]
});

export const SPACE_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_SPACE, KEY_VALUE_SPACE_NAME, KEY_VALUE_SPACEBAR],
  codeValues: [KEY_CODE_NAME_SPACE],
  keyCodes: [KEY_CODE_SPACE],
  keyIdentifiers: [KEY_IDENTIFIER_SPACE, KEY_IDENTIFIER_SPACEBAR]
});

export const ESCAPE_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ESCAPE, KEY_VALUE_ESC],
  codeValues: [KEY_CODE_NAME_ESCAPE],
  keyCodes: [KEY_CODE_ESCAPE],
  keyIdentifiers: [
    KEY_IDENTIFIER_ESCAPE,
    KEY_IDENTIFIER_ESC,
    KEY_IDENTIFIER_ESCAPE_CODE
  ]
});

export const ARROW_LEFT_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ARROW_LEFT, KEY_VALUE_LEFT],
  codeValues: [KEY_CODE_NAME_ARROW_LEFT],
  keyCodes: [KEY_CODE_ARROW_LEFT],
  keyIdentifiers: [KEY_IDENTIFIER_ARROW_LEFT]
});

export const ARROW_RIGHT_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ARROW_RIGHT, KEY_VALUE_RIGHT],
  codeValues: [KEY_CODE_NAME_ARROW_RIGHT],
  keyCodes: [KEY_CODE_ARROW_RIGHT],
  keyIdentifiers: [KEY_IDENTIFIER_ARROW_RIGHT]
});

export const ARROW_UP_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ARROW_UP, KEY_VALUE_UP],
  codeValues: [KEY_CODE_NAME_ARROW_UP],
  keyCodes: [KEY_CODE_ARROW_UP],
  keyIdentifiers: [KEY_IDENTIFIER_ARROW_UP]
});

export const ARROW_DOWN_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ARROW_DOWN, KEY_VALUE_DOWN],
  codeValues: [KEY_CODE_NAME_ARROW_DOWN],
  keyCodes: [KEY_CODE_ARROW_DOWN],
  keyIdentifiers: [KEY_IDENTIFIER_ARROW_DOWN]
});

export const HOME_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_HOME],
  codeValues: [KEY_CODE_NAME_HOME],
  keyCodes: [KEY_CODE_HOME],
  keyIdentifiers: [KEY_IDENTIFIER_HOME]
});

export const END_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_END],
  codeValues: [KEY_CODE_NAME_END],
  keyCodes: [KEY_CODE_END],
  keyIdentifiers: [KEY_IDENTIFIER_END]
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
