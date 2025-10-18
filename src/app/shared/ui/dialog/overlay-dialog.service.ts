import { Injectable, InjectionToken, Injector, inject } from '@angular/core';
import {
  Overlay,
  OverlayConfig,
  OverlayRef,
  ComponentType
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable, Subject } from 'rxjs';

import { OverlayDialogContainerComponent } from './overlay-dialog-container.component';

export type OverlayDialogRole = 'dialog' | 'alertdialog';

export interface OverlayDialogConfig<TData> {
  readonly data?: TData;
  readonly autoFocus?: boolean;
  readonly role?: OverlayDialogRole;
  readonly panelClass?: string | readonly string[];
  readonly backdropClass?: string | readonly string[];
  readonly disableClose?: boolean;
  readonly hasBackdrop?: boolean;
  readonly closeOnNavigation?: boolean;
  readonly width?: string;
  readonly maxWidth?: string;
}

export interface OverlayDialogRef<TResult> {
  afterClosed(): Observable<TResult | undefined>;
  close(value?: TResult): void;
}

const OVERLAY_DIALOG_REF = new InjectionToken<OverlayDialogRef<unknown>>(
  'OVERLAY_DIALOG_REF'
);
const OVERLAY_DIALOG_DATA = new InjectionToken<unknown>('OVERLAY_DIALOG_DATA');

type LegacyKeyboardEvent = KeyboardEvent & { keyIdentifier?: string };

interface KeyMatcher {
  readonly keyValues?: ReadonlySet<string>;
  readonly codeValues?: ReadonlySet<string>;
  readonly keyCodes?: ReadonlySet<number>;
  readonly keyIdentifiers?: ReadonlySet<string>;
}

const ESCAPE_KEY_VALUES: ReadonlySet<string> = new Set(['Escape', 'Esc']);
const ESCAPE_CODE_VALUES: ReadonlySet<string> = new Set(['Escape']);
const ESCAPE_KEY_CODES: ReadonlySet<number> = new Set([27]);
const ESCAPE_KEY_IDENTIFIERS: ReadonlySet<string> = new Set(['Escape', 'Esc', 'U+001B']);
const ESCAPE_KEY_MATCHER: KeyMatcher = {
  keyValues: ESCAPE_KEY_VALUES,
  codeValues: ESCAPE_CODE_VALUES,
  keyCodes: ESCAPE_KEY_CODES,
  keyIdentifiers: ESCAPE_KEY_IDENTIFIERS
};

const DEFAULT_BACKDROP_CLASS = 'cdk-overlay-dark-backdrop';

const toArray = (
  value: string | readonly string[] | undefined
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return [value];
  }

  return Array.from(value);
};

class CdkOverlayDialogRef<TResult> implements OverlayDialogRef<TResult> {
  private readonly closed$ = new Subject<TResult | undefined>();
  private container: OverlayDialogContainerComponent | null = null;
  private isClosed = false;
  private result: TResult | undefined;

  constructor(private readonly overlayRef: OverlayRef) {
    this.overlayRef.detachments().subscribe(() => {
      if (this.isClosed) {
        return;
      }

      this.isClosed = true;
      this.container?.restoreFocus();
      this.closed$.next(undefined);
      this.closed$.complete();
    });
  }

  registerContainer(container: OverlayDialogContainerComponent): void {
    this.container = container;
  }

  afterClosed(): Observable<TResult | undefined> {
    return this.closed$.asObservable();
  }

  close(value?: TResult): void {
    if (this.isClosed) {
      return;
    }

    this.result = value;
    this.isClosed = true;
    this.overlayRef.dispose();
    this.container?.restoreFocus();
    this.closed$.next(this.result);
    this.closed$.complete();
  }
}

@Injectable({ providedIn: 'root' })
export class OverlayDialogService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  open<TComponent, TData, TResult>(
    component: ComponentType<TComponent>,
    config: OverlayDialogConfig<TData> = {}
  ): OverlayDialogRef<TResult> {
    const overlayRef = this.overlay.create(this.buildConfig(config));

    for (const panelClass of toArray(config.panelClass) ?? []) {
      overlayRef.addPanelClass(panelClass);
    }

    if (config.width || config.maxWidth) {
      overlayRef.updateSize({
        width: config.width,
        maxWidth: config.maxWidth
      });
    }

    const dialogRef = new CdkOverlayDialogRef<TResult>(overlayRef);

    const portalInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: OVERLAY_DIALOG_REF, useValue: dialogRef },
        { provide: OVERLAY_DIALOG_DATA, useValue: config.data ?? null }
      ]
    });

    const containerPortal = new ComponentPortal(
      OverlayDialogContainerComponent,
      null,
      portalInjector
    );
    const containerRef = overlayRef.attach(containerPortal);
    containerRef.instance.initialize(config.role ?? 'dialog', config.autoFocus ?? true);

    const contentPortal = new ComponentPortal(component, null, portalInjector);
    containerRef.instance.attachComponent(contentPortal);
    dialogRef.registerContainer(containerRef.instance);

    if (!(config.disableClose ?? false)) {
      overlayRef.backdropClick().subscribe(() => dialogRef.close());
      overlayRef.keydownEvents().subscribe((event) => {
        if (!matchesKey(event, ESCAPE_KEY_MATCHER)) {
          return;
        }

        event.preventDefault();
        dialogRef.close();
      });
    }

    return dialogRef;
  }

  private buildConfig<TData>(config: OverlayDialogConfig<TData>): OverlayConfig {
    const backdropClasses = toArray(config.backdropClass) ?? [DEFAULT_BACKDROP_CLASS];
    const hasBackdrop = config.hasBackdrop ?? true;

    return {
      hasBackdrop,
      backdropClass: hasBackdrop ? backdropClasses : undefined,
      disposeOnNavigation: config.closeOnNavigation ?? true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay
        .position()
        .global()
        .centerHorizontally()
        .centerVertically()
    } satisfies OverlayConfig;
  }
}

const matchesKey = (event: KeyboardEvent, matcher: KeyMatcher): boolean => {
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

    if (legacyEvent.keyIdentifier && matcher.keyIdentifiers.has(legacyEvent.keyIdentifier)) {
      return true;
    }
  }

  return false;
};

const resolveKeyCode = (event: KeyboardEvent): number | null => {
  if (typeof event.keyCode === 'number' && event.keyCode > 0) {
    return event.keyCode;
  }

  if (typeof event.which === 'number' && event.which > 0) {
    return event.which;
  }

  return null;
};

export const injectOverlayDialogRef = <TResult>(): OverlayDialogRef<TResult> =>
  inject(OVERLAY_DIALOG_REF) as OverlayDialogRef<TResult>;

export const injectOverlayDialogData = <TData>(): TData =>
  inject(OVERLAY_DIALOG_DATA) as TData;
