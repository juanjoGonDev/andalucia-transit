# Spec: Route direction correctness, trip experience & pinned departures

- **Date:** 2026-09-21
- **Branch:** `arena/01a0c582-andalucia-transit`
- **Process:** Spec-driven (SDD), TDD per item, atomic commits, single branch.
- **Backward compatibility:** Not required (single-user product); migrations are allowed to be
  dropped and data shapes may change freely.

## 1. Problem statement

### Bug A — Map route drawn against the searched direction
When expanding the route preview of a departure in the route-search results, the route drawn
on the map sometimes appears reversed relative to the searched origin → destination pair.
Root causes identified in code:

1. `LineRouteWorkspaceService` / `line-route-geometry.ts`: when the searched direction's
   stops contain fewer than two distinct coordinates, the renderer falls back to the official
   line polyline (`detail.coordinates`), which is direction-blind (typically IDA geometry for
   VUELTA searches), so the route is rendered opposite to the search.
2. When the matched direction has no stops at all in the line-stops payload, selection
   silently falls back to the primary direction, presenting the opposite direction stops,
   markers and route while the departure data still belongs to the searched direction.
3. The map always renders the complete line route without differentiating the searched origin
   and destination stops, making the direction mismatch impossible to spot and hard to read
   even when correct.

### Bug B — Selected stop indistinguishable in map selectors
In the stop selectors backed by a map (route workspace stop list, map page lists), the
selected/hovered stop marker only grows slightly (`7px → 11px`, same green). The selection is
not perceivable, especially in bright sunlight on mobile.

### Improvement opportunities
- Drivers answer "where do I get off?" with ordinals per nucleus ("la primera de La Gangosa").
  The stop list does not expose that information.
- Recent search cards waste vertical space: `Buscaremos para {longDate}` wraps, the
  `Actualizado a hoy` line is redundant, and `En 1h 5m` countdowns plus separate relative rows
  add avoidable height.
- No way to keep watching a specific departure across pages ("pin it").
- No live trip progress: users on board cannot see which stop they are at, smooth progress
  between stops, or a glanceable ETA like Google Maps offers in Valencia.

## 2. Scope & checklist

### Fixes
- [x] **F1 Direction-strict departure preview maps.** Given a searched direction, the drawn
  route always runs origin → destination in that direction. The official polyline, when used,
  is oriented/sliced against the searched stops; when the direction's stops are missing there
  is no silent opposite-direction presentation (fall back to markers-only display with an
  explicit notice instead of reversed geometry). Unit tests for every coordinate source.
- [x] **F2 Origin/destination differentiation on the preview map.** Searched origin and
  destination stops render with distinct, high-contrast marker treatments (color, size,
  legend-free iconography) and matching badges in the stop list, including accessible names
  (`Origen: …`, `Destino: …`).
- [x] **F3 Unmistakable selected-stop highlight.** Selected/hovered markers get a distinct
  color plus halo ring and front stacking, applied to `route-map` and the map page stop layer.

### Improvements
- [x] **I1 Nucleus ordinal per stop.** In the departure preview stop list, each stop shows its
  ordinal within its nucleus/municipality following the searched direction
  (e.g. `1.ª en La Gangosa`), ordered "closest first" towards the destination. Unknown nuclei
  ust omit the badge.
- [x] **I2 Short numeric search date.** Recent search cards show just the date, locale-aware
  ordering, zero-padded day/month and 4-digit year (es: `21/09/2026`, en: `09/21/2026`).
  New `formatShortNumericDate` domain util with tests; `Buscaremos para {date}` wording removed.
- [x] **I3 Redundant "Actualizado a hoy" removed.** Notice, inputs and i18n keys deleted
  (`showTodayNotice`, `searchDateToday`); query-date auto-adjust logic stays.
- [x] **I4 Recent preview entries compacted.** Arrow semantics: red up-arrow = previous
  ("hace"), white down-arrow on blue chip = next ("en"); countdown shows only the largest unit
  (`1h`, `5m`, `59s`); arrow+countdown move into the line header row to save a line break.
  Fully accessible: icon-only visuals are `aria-hidden`, each entry exposes a complete spoken
  label (`Hace 5 minutos`, `En 1 hora`, never "un hache").
- [x] **I5 Largest-unit countdown everywhere.** The route-search departure relative label
  adopts the same largest-unit visual + full spoken form rules
  (new `buildCountdownLabels` domain util, shared by I4/I5/N2).

### New features
- [x] **N1 Live trip tracking.** From an upcoming departure, the user can start live tracking:
  - High-accuracy `watchPosition` GPS (new `GeolocationService.watchPosition`).
  - Full direction timeline origin → destination with **progressive** fill between stop nodes
    driven by GPS projection on the route geometry (no jumps between nodes).
  - Current/just-passed stop detection and polite live-region announcements.
  - Sticky header with destination + ETA while the timeline scrolls; smooth auto-scroll that
    only engages when needed; manual scroll reveals a "recenter" floating button.
  - ETA = scheduled times interpolated by traveled progress, degrading gracefully.
  - Route `/viaje/...` deep-linkable; entry points from route-search departures and the pin.
- [x] **N2 Pinned departure.** Pin action on route-search departures persists one active pin
  (new pin replaces). The app shell top actions show a pinned-bus indicator with a circular
  countdown ring around the bus icon (fills to 100% at departure time); tapping expands the
  remaining-time chip to the left; activation navigates back to the search (or live trip when
  tracking is available). Storage, expiry and cleanup covered with tests.

### Docs / hygiene
- [x] **D1** i18n (es/en) for all new strings; no hardcoded UI copy.
- [x] **D2** `docs/feature-checklist.md` + `AGENTS.md` decision log updated.
- [x] **D3** Final report with mobile-first improvement recommendations (visual + new
  features) delivered for user validation.

## 3. Non-goals (this PR)
- Real-time vehicle positions from CTAN (the API does not expose them); ETA is
  schedule-informed estimation driven by device GPS.
- Multi-pin management UI.
- Changes to alarm scheduling semantics.

## 4. Accessibility requirements (all items)
- WCAG 2.2 AA targets preserved: contrast, focus visibility, keyboard operability.
- Every icon-only state has a complete localized `aria-label`; time information announced as
  full units (`1 hora`, `5 minutos`), never letter abbreviations.
- Live trip uses a single polite live region, throttled, announcing stop transitions and ETA
  changes without duplication.
- Reduced-motion honored for auto-scroll and ring animations.

## 5. Technical design (summary)
- Extend `LineRouteWorkspaceRequest` with an optional search segment
  (`originStopIds`/`destinationStopIds`); `RouteSearchDepartureView` carries both id lists.
- New pure functions in `@domain/lines/line-route-geometry`:
  `orientPolylineToFirstStop` (polyline reversal detection) and
  `buildStopNucleusOrdinals` (I1), plus `@domain/utils/countdown-labels` (I4/I5/N2) and
  `@domain/utils/date-format` (I2), all with unit tests first.
- `LeafletMapService` marker roles (origin/destination/regular) + distinct highlight ring.
- Trip tracking: `@domain/trip/trip-progress.util` (point projection, segment progress, stop
  arrival estimation), `@domain/trip/live-trip.service` (watch stream + state),
  `@features/trip/trip.component` (sticky header, progressive timeline, auto-center).
- Pin: `@data/route-search/pinned-departure.storage`, `@domain/.../pinned-departure.service`,
  shell-level pinned indicator component with SVG ring.

## 6. Verification plan
- `pnpm run test:angular` (Jasmine/Karma) green incl. new specs per item — TDD.
- `pnpm run test:scripts`, `pnpm run lint`, `pnpm run build` green locally; CI must pass.
- No visual regressions beyond intended changes (CI visual-evidence workflow output reviewed).

## 7. Follow-up round — visual QA fixes (screenshot-driven)
- [x] **E1 Smooth map re-centering.** Selecting a stop from the workspace panel (or tapping a
  marker) pans the map smoothly to it preserving zoom, via `MapHandle.centerStop(stopId)`.
- [x] **E2 Nucleus ordinal resolution fix.** Prefix-named lines (e.g. `M-301`) resolve the
  correct nucleus so the per-stop ordinal numbering (I1) no longer shows 0-bulk entries.
- [x] **E3 Pinned departure chip spacing.** Indicator panel gets balanced padding/gap and a
  minimum height so the countdown block no longer touches its edges.
- [x] **E4 Recent-search card preview redesign.** Per-departure row is a fixed-column grid
  (line badge → wait label → right-aligned time), direction arrows removed, past departures
  rendered in a muted tone and upcoming ones highlighted; the search date shares the title
  line when space allows (responsive flex wrap). Contrast raised to WCAG 2.2 AA.

## 8. Follow-up round 2 — polish + recurring alarms (screenshot-driven)
- [ ] **E5 Line badge never truncates.** The recent-preview line badge keeps every catalog
  line code on one line (no wrapping) with a minimum inline size sized for the longest
  code in the catalog (6 chars, verified against all consortium datasets).
- [ ] **E6 Smooth medium zoom on re-centering.** When the map focuses a stop it also adapts
  zoom smoothly toward a medium target: zoom in when the view is too far, zoom out when too
  close, keeping the current level when it is already inside the comfort band.
- [ ] **E7 Trip timeline padding.** The trip view gets horizontal breathing room and bottom
  clearance so its last stops never sit under the persistent bottom navigation.
- [ ] **E8 Pinned departure chip redesign.** The external-link action goes away: tapping the
  bubble itself opens the search; the dismiss action uses a trash icon (not a close X); the
  countdown drops the "En" prefix and gains a small clock icon; the line badge keeps spaced
  left padding.
- [ ] **E9 Recurring alarms skip the lead-time check.** Setting a repeating reminder must not
  be blocked when the remaining time today is shorter than the reminder offset; the
  one-shot check applies only to one-shot alarms.
- [ ] **E10 Weekday recurrence.** "Todos los días" becomes "Recurrente": the user picks the
  weekdays the reminder should ring (L M X J V S D chips). Alarms roll to the next selected
  weekday; weekday selection UI follows spacing/padding conventions and remains keyboard
  and screen-reader friendly.
