# Immersive transit navigation

## Request
Modernize the application navigation and map experience using only interaction patterns that fit Andalucia Transit. External bus-app references are inspiration for hierarchy and ergonomics, not a feature list. Do not add ticket purchasing or any capability unsupported by the product.

The requested outcome is:

- replace the current icon-only floating navigation with a clearer mobile-first application navigation;
- make Home, route search, Map and Favorites immediately reachable without opening a secondary menu;
- keep secondary destinations such as Recents, News and Settings behind a More action;
- make the map an immersive primary surface rather than a card inside a page;
- integrate map search and map actions over the map surface;
- keep nearby stops and route results visible without forcing the user to leave the map;
- make selected stops visually actionable and provide a route-planning action toward the selected stop using the existing route-search flow;
- preserve existing geolocation, stop detail, route overlay, favorites, offline and bilingual behavior.

## Evidence
- `AppShellTopActionsComponent` currently exposes only Home, Map and Menu as unlabeled persistent actions. Route search and Favorites are therefore slower to discover even though they are primary product workflows.
- `MapComponent` currently renders a page hero, search row, map canvas and results panel as separate stacked/column regions. The map is important but is not the dominant visual surface.
- The map already has canonical stop search, geolocation, nearby-stop discovery, stop-detail navigation, route overlays and route-direction geometry. These capabilities should be recomposed rather than reimplemented.
- `RouteSearchComponent` is an existing routed workflow and must remain the route-planning owner. The map must not invent a parallel journey-planning engine.
- The project already uses Material Symbols, semantic navigation utilities, layout context, design tokens, Leaflet and responsive Playwright evidence. No new UI, icon, mapping or animation dependency is justified.
- Product scope does not include ticket purchase or pedestrian turn-by-turn navigation. Do not copy those concepts from external references.

## Decision

### Navigation
- Keep `AppShellTopActionsComponent` as the single owner of global application navigation.
- Mobile uses a fixed bottom dock with five destinations: Home, Search routes, Map, Favorites and More.
- Desktop uses the same primary destinations in a compact labeled floating navigation so the information architecture does not change between breakpoints.
- More contains Recents, News and Settings. Do not duplicate primary destinations inside More.
- Use native `a`/`RouterLink` for navigation destinations and preserve `aria-current="page"`.
- Reserve safe-area-aware layout space so the dock never covers page content, focused controls, map sheets or dialogs.

### Map
- Remove the large page hero from the map route. The map itself becomes the page-level hero/workspace.
- Render the Leaflet canvas as a viewport-bounded immersive surface.
- Overlay the existing `MapSearchComponent` near the top of the map.
- Add a vertical map action rail using existing actions only: locate user, fit the whole Andalucia network and open route search.
- Keep the nearby/routing inspector as a floating right-side surface on desktop with independent scrolling.
- On mobile, move the inspector below/over the lower part of the map as a bounded sheet above the persistent navigation dock. The map remains visible while browsing results.
- Keep green as the stop identity and blue as route identity.
- Preserve the existing Leaflet popup as a concise map affordance. The richer inspector remains Angular-owned.

### Route planning toward a stop
- A selected/nearby stop may expose `Plan route` which navigates to the existing route-search feature with that stop as destination only if the existing route-search contract can represent it without introducing a new public API.
- Do not claim walking navigation from the user's exact coordinate. Geolocation continues to provide nearby-stop/distance context.
- If the current route-search URL/state cannot safely prefill a destination, keep the action as `Search routes` and do not invent an incompatible deep-link contract.

## Acceptance criteria

### Navigation
- At `390x844`, Home, Search routes, Map, Favorites and More are visible without opening a menu.
- Persistent mobile targets are at least 44x44 CSS pixels and account for `env(safe-area-inset-bottom)`.
- The active destination is communicated with label, icon and `aria-current`, not color alone.
- The dock does not overlap page content, dialog actions or focused inputs at 320 CSS pixels, 390x844 or 200% zoom/reflow.
- Desktop exposes the same primary destinations without the current three-icon-only pill.
- Hover motion remains purposeful and is removed under `prefers-reduced-motion`.

### Map
- At `1440x900`, the map is the dominant page surface and remains visible while the right inspector scrolls independently.
- At `390x844`, search and map controls are directly reachable, the map remains substantial, and inspector content is reachable without horizontal overflow.
- Search is visually integrated with the map rather than appearing as a separate page form.
- A map action rail provides locate, fit-network and route-search actions with accessible names and 44px-class targets.
- Existing stop markers, route arrows, popup detail navigation, route selection and network bounds continue to work.
- Nearby-stop cards retain hover/focus marker highlighting and stop-detail navigation.

### Scope safety
- No ticketing, payment, fare-purchase, account or unsupported backend behavior is added.
- No new mapping/UI/icon dependency is added.
- No external walking-routing service is introduced.

## Tests
- Extend `AppShellTopActionsComponent` unit tests for the five primary destinations, active state and More contents.
- Extend browser layout tests for bottom-dock clearance, target sizes and active navigation at mobile and desktop viewports.
- Extend map component/service tests for fit-network action and any selected-stop navigation contract that is reused.
- Extend Playwright map coverage for integrated search/action rail, desktop inspector scroll and mobile sheet clearance above navigation.
- Keep deterministic data/empty evidence and rendered contrast checks.
- Final exact-head CI must pass scripts, formatting, lint, Angular tests and production build.
- Final exact-head visual workflow must publish and be manually reviewed at 390x844 and 1440x900.

## Risks
- A fixed mobile dock can hide content or focused fields. Mitigate at the shared layout owner with safe-area-aware reserved space, not per-page padding overrides.
- An immersive map can create nested-scroll traps. Keep the map itself fixed within the workspace while only the inspector scrolls; retain document scrolling where required by narrow layouts.
- Exposing five primary items can become crowded at 320 CSS pixels. Use concise translated labels, icons from the existing family and flexible equal-width items.
- Reusing route search from a selected stop must not create a second route-state owner or an undocumented URL contract.

## Rollback
Revert the focused navigation/map commits. No data migration, persistent schema or backend contract change is involved.

## Checks
- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run test:scripts`
- `pnpm run test:angular`
- `pnpm run build`
- Playwright shell/map acceptance
- exact-head PR visual evidence workflow

## Delivery
Continue on PR #36 branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use focused Conventional Commits. Do not merge, release or deploy.

## Status
In progress.
