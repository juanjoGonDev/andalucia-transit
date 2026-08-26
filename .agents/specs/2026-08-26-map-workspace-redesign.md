# Map workspace redesign

## Request
Redesign the map surface from the current cramped, card-heavy presentation into a transport workspace that remains readable while exploring stops and routes. The requested outcome is:

- popup content follows the application visual system instead of Leaflet defaults;
- stop markers and stop affordances are visually distinct from route lines using the existing success/green token family;
- route overlays communicate travel direction with arrow cues;
- desktop gives the map the dominant left column and a full-height independently scrollable right panel;
- mobile preserves the same information hierarchy with a large map followed by a bounded, independently scrollable results panel;
- spacing and grouping are increased so nearby stops, route selection and route results do not visually collapse into one block.

## Evidence
- `src/app/features/map/map.component.html` currently renders the map and nearby/routes panel as siblings, but the nearby and route sections share one visually dense panel without stronger grouping.
- `src/app/features/map/map.component.scss` caps the entire workspace at `64rem`, uses a relatively short map (`30rem`–`36rem` at desktop), and does not give the right panel its own scroll container.
- `src/app/shared/map/leaflet-map.service.ts` uses primary blue for stop markers and dark primary for route lines, so the two transport concepts are not differentiated strongly enough.
- stop popup markup is intentionally minimal and relies on Leaflet wrapper defaults; there is no dedicated global stylesheet for Leaflet-owned popup DOM.
- the existing theme already owns `--color-success` / `--color-success-soft`, so no new color token or dependency is required.
- PR visual evidence already exercises the map in Chromium and is the canonical final authority for rendered UI.

## Decision
- Keep `MapComponent` as the feature-layout owner and `LeafletMapService` as the map-rendering owner.
- Introduce a dedicated global `src/styles/_map.scss` partial only for Leaflet-created DOM that Angular component encapsulation cannot style reliably. Import it from `src/styles.scss`; do not place generic page layout rules there.
- Use existing success tokens for stop markers, stop icons and popup stop identity. Keep route polylines in the existing blue family.
- Render lightweight direction indicators from route geometry inside `LeafletMapService` without adding a decorator/plugin dependency.
- Expand marker metadata only with display fields already present in the canonical stop directory (`code`, `municipality`) so popup layout can be structured without additional data requests.
- On desktop, make the workspace wider, use a map-dominant two-column split, give both columns a shared viewport-bounded height, and make the right panel scroll independently.
- On mobile/tablet, stack the workspace while keeping a large map and a bounded results panel with independent scrolling; do not make the full document depend on a nested scroll trap for primary navigation.

## Acceptance criteria
- Stop markers render green in normal and selected/highlighted states and remain visually distinct from blue route lines.
- Stop cards expose a green stop icon without replacing the stop name/code hierarchy.
- Route overlays display direction arrow cues that follow the coordinate order and do not capture pointer events.
- Popups have application spacing, typography, radius, border/shadow, structured stop metadata and a clear details action; Leaflet default margins do not compress the content.
- At `1440x900`, the map is the dominant left column, the right panel reaches the same workspace height and scrolls internally while the map remains visible.
- At `390x844`, the map remains substantial and the results panel is readable with its own bounded scroll area; no horizontal overflow or clipped primary controls is introduced.
- Nearby stops and route results have visually separated sections with comfortable spacing.
- Existing map search, geolocation, popup navigation, route selection, highlighting, keyboard semantics and async states continue to work.

## Tests
- Extend `MapComponent` unit coverage for enriched marker metadata passed to the shared map service.
- Extend Playwright map coverage to assert the desktop workspace geometry / independent panel overflow and mobile bounded layout.
- Keep the real popup navigation and route interaction coverage green.
- Final CI must pass lint, script tests, Angular tests and build.
- Final visual-evidence workflow must pass on the exact head SHA and publish fresh `390x844` and `1440x900` screenshots.

## Risks
- Leaflet popup DOM is outside Angular component style encapsulation; styling it in feature SCSS would be unreliable, hence the dedicated global map partial.
- Route direction markers can become noisy when many alternatives overlap; keep indicator count bounded per route and non-interactive.
- Nested panel scrolling can harm mobile usability if overused; constrain only the results panel and retain normal page scrolling for header/search/workspace discovery.
- Increasing workspace width can expose existing responsive assumptions; guard the canonical mobile and desktop dimensions explicitly.

## Rollback
Revert the focused map-workspace commits. No data migration, API contract or persistent state changes are involved.

## Checks
- `pnpm run lint`
- `pnpm run test:scripts`
- `pnpm run test:angular`
- `pnpm run build`
- Playwright map exploration/layout tests
- exact-head PR visual evidence workflow

## Delivery
Continue on PR #36 branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use focused Conventional Commits. Do not merge, release or deploy.

## Status
In progress.
