# Schedule search mobile layout and stop departure alarms

## Request

Three deliverables from direct user feedback (2026-09-21, reported in Spanish):

1. The schedule search form looks wrong on mobile: it lacks the balanced proportions of ALSA's planner (two squeezed columns plus an oversized swap column).
2. Bug: the date selector renders behind the fixed bottom navigation menu.
3. New feature: configurable departure alarms with quick offset presets (5/10/30 min, 1–2 h, custom), optional daily repetition that keeps ringing until the user deactivates it, delivered as PWA notifications. Notification permission must be verified before saving; without it the UI must show an error with an action to request permission again.

## Evidence

- Playwright captures on a 390 px viewport (sandbox Chromium with self-hosted fonts to bypass the blocked Google Fonts CDN) showed the two origin/destination columns at roughly 150 px each on a 390 px screen while a dedicated grid column reserved 2.75–3 rem for the swap control.
- Live-DOM probing showed the datepicker's touch dialog and the app's custom overlay dialogs inside the CDK overlay container, whose stacking context caps at `z-index: 1000`; the fixed bottom navigation uses `--z-index-sticky` (1100), so any inner z-index could never clear it. CDK's `GlobalPositionStrategy` also sets `align-items: center` inline on the overlay wrapper, which beats any external `align-items` override.
- The dark "arc" at the bottom of every pill field is MDC's inactive `mdc-line-ripple::before` idle underline, clipped by the field's rounded border (`overflow: hidden` on `.mat-mdc-text-field-wrapper`).
- The CTAN API is unreachable from the sandbox; stop-detail verification used Playwright route mocking with fresh service times computed in `Europe/Madrid` local time (naive `Date#getHours` mocks produced UTC-shifted times that the UI correctly classified as past departures).
- Runtime review in a real-Chromium context surfaced four latent defects that unit tests with stubs had missed: `request()` trusting a stale permission snapshot, scheduler specs creating alarms with already-elapsed triggers (correctly rejected by `StopAlarmsService.add`), spec pollution of `window.Notification`, and — product-level — boot-time hydration silently rolling near-missed triggers forward so alarms missed while the PWA was closed never rang.
- CI on PR #442: Lint, Test scripts, Test angular, and Deploy pipeline all SUCCESS; the reviewed visual-baseline job is skipped by workflow rules for this path.

## Decision

1. The mobile search grid stacks origin, destination, and date full-width. The swap control becomes a compact floating circle absolutely positioned on the seam between origin and destination (ALSA-style), so no grid column is reserved for it and text inputs keep the full card width.
2. `.app-field` hides `.mdc-line-ripple` (pill fields own their border) and enforces a 3.5rem minimum field height for uniform proportions across viewports.
3. The datepicker opens with `touchUi` on viewports below 768px (reactive `BreakpointObserver`, shared as `datepickerTouchUi$`), turning the Material dialog layout into a bottom sheet.
4. Datepicker overlay elevation is owned by `src/styles.scss`: the container, backdrop, and pane use `--z-index-modal` while a `mat-datepicker-dialog` pane exists (`:has()` selector). The pane uses `align-self: flex-end` + `width: 100%` because the wrapper's inline `align-items` cannot be overridden externally. App-level overlay dialogs (`app-overlay-dialog-container`) get the same container elevation because their action buttons sit in the bottom-navigation zone.
5. Alarm identity is `(stopId, serviceId)` encoded as `stopId::serviceId`; one alarm exists per scheduled service, and re-creating updates it. Stop schedule `serviceId`s are stable per stop/line/index, so the bell reflects persistence state per departure row.
6. `StopAlarmsService` is the single mutation owner (hydrates, validates reachability, enforces a per-stop limit, sorts by next trigger); `StopAlarmsStorage` is the only persistence point with strict normalization; UI components never touch storage, mirroring the favorites architecture.
7. Trigger math lives in pure functions (`computeNextTriggerAt`, `advanceRepeatTrigger`): one-shot alarms expire at their arrival time; repeating alarms advance +1 day from the fired trigger, capped at `maxRepeatDays` (30) after the scheduled arrival.
8. Hydration keeps triggers that elapsed within a 2-minute grace window pending instead of rolling them forward, and `AlarmSchedulerService.initialize()` drains due triggers immediately on boot: alarms missed while the PWA was closed ring on reopen. Triggers missed by longer than the grace window expire silently (one-shot) or roll to the next day (repeating).
9. Notification dispatch depends on the PWA being alive; there is no reliable web-only wake-up when the browser kills the app. Push API scheduling is out of scope for this iteration and noted as future work.
10. `NotificationPermissionService` re-reads the browser state on every `request()` (stale snapshots caused false "denied" flows), exposes a reactive `permission$`, and `show()` no-ops unless permission is granted.
11. The alarm dialog requests permission inside the save gesture, and nothing is persisted unless the result is `granted`. Denied/unsupported states render an inline `role="alert"` block with browser-specific recovery instructions and an in-dialog retry action that re-runs the request; the block auto-scrolls into view.
12. Quick choices (5/10/30 min, 1 h, 2 h) and custom minutes (max 12 h) come from `APP_CONFIG.alarms`. The default selection degrades to the shortest still-valid chip when the configured default would land in the past, so the dialog never opens blocked while a valid option exists.
13. Repeating alarms that fire surface an in-app banner on the stop page (replayed via `latestFired$` + `combineLatest` with the route context so late page opens still show it) with a "Turn off" action and a dismiss control; dismissal only hides the banner, it never mutates the alarm.
14. The fired banner, bell states, dialog copy, notifications, and the cancel-confirmation dialog are ngx-translate-owned (es/en), wired through `APP_CONFIG.translationKeys`; no parallel copy dictionaries.
15. `OVERLAY_DIALOG_REF`/`OVERLAY_DIALOG_DATA` tokens are exported so dialog components are testable with the repository's TestBed patterns.
16. The intentional home-mobile rendering change may require advancing the reviewed visual baseline after merge; the baseline job is reviewed-gated and was skipped on this PR.

## Acceptance

- On 390 px viewports the search form renders three stacked full-width fields with a floating swap button; no clipped input text and no reserved swap column.
- No idle underline artifact appears under pill fields in any viewport.
- The datepicker opens as a bottom sheet above the bottom navigation on mobile and as an anchored popup above it on desktop; custom overlay dialog buttons are clickable while the navigation is visible.
- A departure alarm rings as a PWA notification at arrival-minus-offset, re-arms daily unless deactivated, and can be deactivated from the fired banner, the confirmation dialog, or by re-tapping the bell.
- Saving without notification permission never persists an alarm and always presents the error plus a working retry action.
- `ng test` (581), `ng lint`, and the production build pass; CI on PR #442 is green.
