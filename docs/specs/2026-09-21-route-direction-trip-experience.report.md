# Final report — Route direction & trip experience (PR #443)

Date: 2026-09-22 · Branch: `arena/01a0c582-andalucia-transit` · Spec: `2026-09-21-route-direction-trip-experience.md`

## 1. Delivered scope

### Fixes
- **F1 — Direction-strict preview maps.** The renderable route is sliced to the searched direction before drawing the polyline; opposite-direction service never leaks onto the map.
- **F2 — Origin/destination differentiation.** Searched origin and destination render with distinct marker treatments inside the preview map.
- **F3 — Selected-stop highlight.** The active stop is unmistakable in both the list and the map (scale + color ring), including hover parity.
- **E1 — Smooth map re-centering.** `MapHandle.centerStop(stopId, animate?)` pans the map (shared camera duration, zoom preserved) whenever a stop is chosen from the workspace panel or a marker.
- **E2 — Nucleus ordinal resolution.** Prefix-named line codes (e.g. `M-301`) resolve their nucleus so per-stop ordinals are correct.

### Improvements
- **I1 — Nucleus ordinal per stop** in the departure preview list.
- **I2 — Short numeric search date** on recent cards, locale-aware.
- **I3 — “Actualizado a hoy” removed** (notice, inputs, i18n keys).
- **I4 → E4 — Recent preview rows.** Arrow semantics replaced by a fixed-column grid (line badge → wait label → right-aligned tabular time); columns stay stable regardless of text length; past departures render muted, the upcoming one highlighted (WCAG 2.2 AA contrast).
- **I5 — Largest-unit countdown** everywhere (`En 2h` instead of `En 118m`).
- **E3 — Pinned chip spacing** (balanced padding/gap, 2.75rem min height).

### New features
- **N1 — Live trip tracking** (`src/app/domain/trip`, `src/app/features/trip`): GPS watch session, progressive timeline, auto-centered map.
- **N2 — Pinned departure** (`PinnedDepartureService` + shell indicator with SVG countdown ring).

### Docs / hygiene
- **D1 i18n.** All templates touched (`recent-search-preview-entry`, pinned indicator, trip timeline, workspace) render copy exclusively through `translate` pipes; keys live in `es.json`/`en.json`. Verified no hardcoded Spanish strings in the new templates.
- **D2** `docs/feature-checklist.md` entries added for E1–E4; `AGENTS.md` decision log records `MapHandle.centerStop` semantics and the `@ViewChild` template-reference rule for stubs.
- **D3** This report.

## 2. Verification evidence
- Unit suites: **678 Angular specs green** locally and in CI (`Test angular` job, ~1m11s).
- CI on head `c8e9e05`: Install, Lint, Test angular, Test scripts, Deploy pipeline, Legal privacy browser flow — all **pass**; CodeRabbit **pass**.
- Writing workflow: strict RED→GREEN per item (spec first, pinned behavior via jasmine spies).
- Manual visual review performed with deterministic mock data (`--mock-mode data` seeds history cards) at 390×844 and 1200×800: badge/wait/time columns align across rows; date flexes inline at ≥~700px; pinned chip meets min height.

## 3. Mobile-first improvement recommendations (for future PRs)

### Visual
1. **Sticky map context on route workspace.** On <768px the map currently scrolls away; a 120–150px sticky mini-map header while browsing the stop list would preserve orientation without hiding list content.
2. **One-thumb action cluster in cards.** The close action on history cards sits top-right — reachable, but the *open* action is the whole card. Consider an explicit bottom-right “Ver horarios” affordance ≥44×44px for one-thumb reachability.
3. **Countdown emphasis on pinned chip.** Raise the countdown numerals to `tabular-nums` + size token `m` so the remaining time is glanceable from 50cm; keep the ring decorative.
4. **Preview empty state micro-copy.** History first run shows a large empty area; a single-sentence hint with an arrow toward the Buscador tab would prime first-time users.

### New features (highest value first)
1. **Offline trip resume (N1 follow-up).** Persist `trip-session` chunks to IndexedDB so a tracked trip survives a tunnel cut; replay buffered GPS points when `online` fires.
2. **Next-departure widget on Home hero.** Under “Planifica tu próximo viaje”: the single next upcoming departure from pinned+favorites (no card body, 1 line + countdown) — zero-tap glanceability.
3. **Arrival fuzzy ETA.** Blend schedule time with live position (N1) into a soft ETA band (“llega sobre 09:42–09:47”) shown in trip header; already feasible with `trip-progress.util`.
4. **Share trip deep link.** Copy a trip session URL (origin, destination, line, departure) with the existing signature scheme so a relative can follow the same trip read-only.

## 4. Known limitations
- Preview rows inside history cards depend on live API availability; mock `--mock-mode data` disables previews (`previewEnabled: false`) — a mock preview endpoint would close this gap for demo servers.
- Map centering supersedes user pan while animating (Leaflet ignores intermediate pans); acceptable at 0.4s duration.
