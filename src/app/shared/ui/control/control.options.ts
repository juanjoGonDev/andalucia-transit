export type ControlVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'subtle';
export type ControlSize = 'sm' | 'md' | 'lg';
export type ControlTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export const CONTROL_BASE_CLASS = 'control' as const;
export const CONTROL_CHOICE_CLASS = 'control-choice' as const;
export const CONTROL_CHOICE_DISABLED_CLASS = 'control-choice--disabled' as const;
export const CONTROL_CHOICE_GROUP_CLASS = 'control-choice-group' as const;
export const CONTROL_CHOICE_GROUP_HORIZONTAL_CLASS = 'control-choice-group--horizontal' as const;
export const CONTROL_CHOICE_INPUT_CLASS = 'control-choice__input' as const;
export const CONTROL_CHOICE_LABEL_CLASS = 'control-choice__label' as const;
export const CONTROL_INDICATOR_CLASS = 'control-indicator' as const;
export const CONTROL_INDICATOR_CHECKBOX_CLASS = 'control-indicator--checkbox' as const;
export const CONTROL_INDICATOR_RADIO_CLASS = 'control-indicator--radio' as const;
export const CONTROL_INDICATOR_MARK_CLASS = 'control-indicator__mark' as const;
export const CONTROL_INDICATOR_DOT_CLASS = 'control-indicator__dot' as const;
export const CONTROL_SWITCH_CLASS = 'control-switch' as const;
export const CONTROL_SWITCH_HANDLE_CLASS = 'control-switch__handle' as const;

export const CONTROL_VARIANT_CLASS_MAP: Readonly<Record<ControlVariant, string>> = {
  primary: 'control--primary',
  secondary: 'control--secondary',
  ghost: 'control--ghost',
  outline: 'control--outline',
  destructive: 'control--destructive',
  subtle: 'control--subtle'
};

export const CONTROL_SIZE_CLASS_MAP: Readonly<Record<ControlSize, string>> = {
  sm: 'control--sm',
  md: 'control--md',
  lg: 'control--lg'
};

export const CONTROL_TONE_CLASS_MAP: Readonly<Record<ControlTone, string>> = {
  neutral: 'control--tone-neutral',
  info: 'control--tone-info',
  success: 'control--tone-success',
  warning: 'control--tone-warning',
  error: 'control--tone-error'
};
