import { InjectionToken } from '@angular/core';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

export interface DialogConfig<TData> {
  readonly data?: TData;
  readonly size?: DialogSize;
  readonly preventClose?: boolean;
  readonly ariaLabelledBy?: string;
  readonly ariaDescribedBy?: string;
}

export interface DialogResolvedConfig<TData> {
  readonly data?: TData;
  readonly size: DialogSize;
  readonly preventClose: boolean;
  readonly ariaLabelledBy: string | null;
  readonly ariaDescribedBy: string | null;
}

export const DIALOG_DATA = new InjectionToken<unknown>('DIALOG_DATA');
export const DIALOG_CONFIG = new InjectionToken<DialogResolvedConfig<unknown>>('DIALOG_CONFIG');
