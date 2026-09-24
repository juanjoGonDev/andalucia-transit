import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  /** Translation key rendered inside the action button. */
  readonly labelKey: string;
  readonly params?: Record<string, unknown>;
  readonly run: () => void;
}

export interface ToastRequest {
  /** Material Symbols glyph name rendered to the left of the title. */
  readonly icon: string;
  readonly titleKey: string;
  readonly titleParams?: Record<string, unknown>;
  readonly bodyKey?: string;
  readonly bodyParams?: Record<string, unknown>;
  /** Override per-toast lifetime; falls back to the service default. */
  readonly durationMs?: number;
  readonly action?: ToastAction;
}

export interface ToastEntry {
  readonly id: number;
  readonly icon: string;
  readonly titleKey: string;
  readonly titleParams?: Record<string, unknown>;
  readonly bodyKey?: string;
  readonly bodyParams?: Record<string, unknown>;
  readonly durationMs: number;
  readonly action?: ToastAction;
}

const DEFAULT_DURATION_MS = 6_000;
const MAX_VISIBLE = 3;

/**
 * Ephemeral in-app notifications. Entries stack newest-first and auto-dismiss
 * after their lifetime; the presenter never keeps more than `MAX_VISIBLE`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly entries = signal<readonly ToastEntry[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly toasts = this.entries.asReadonly();

  show(request: ToastRequest): number {
    const id = this.nextId++;
    const entry: ToastEntry = {
      id,
      icon: request.icon,
      titleKey: request.titleKey,
      titleParams: request.titleParams,
      bodyKey: request.bodyKey,
      bodyParams: request.bodyParams,
      durationMs: request.durationMs ?? DEFAULT_DURATION_MS,
      action: request.action
    };

    this.entries.update((current) => [entry, ...current].slice(0, MAX_VISIBLE));
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), entry.durationMs)
    );

    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.entries.update((current) => current.filter((entry) => entry.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.entries.set([]);
  }
}
