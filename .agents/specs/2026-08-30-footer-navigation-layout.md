# Footer and fixed navigation layout

## Request

Refine the legal footer introduced in PR #36 so it never steals usable viewport height or creates a contrasting blank band. The fixed bottom navigation must remain visible at the bottom of the viewport. The map must remain a full `100dvh` workspace while legal links remain accessible in a compact, visually adapted overlay. Scrolling routes must expose the legal links at document end with enough clearance that the fixed navigation never covers them.

## Evidence

- User-provided Home evidence showed the first footer implementation as a large contrasting strip between the routed hero and fixed navigation.
- User-provided Map evidence showed the footer reducing the visible map workspace and creating a separate grey band.
- `AppShellTopActionsComponent` already owns fixed bottom navigation via `position: fixed; bottom: 0`.
- `MapComponent` already owns an immersive `100dvh` workspace and existing Playwright coverage requires its lower edge to match the desktop viewport edge.
- `AppLayoutComponent` renders the activated route and `LegalFooterComponent` as siblings in a flex column. Without a non-shrinking route boundary, the footer can compete for vertical space with immersive content.
- The shared layout context already owns routed surface state. Footer placement belongs in the same contract rather than being inferred from URLs or duplicated in feature CSS.

## Decision

1. Keep bottom navigation fixed and continuously visible; do not convert it to document-flow navigation.
2. Introduce a closed footer placement contract: `flow | overlay`.
3. `flow` is the default for ordinary routes. The footer follows the routed document and reserves the canonical fixed-navigation clearance so its links remain unobscured at maximum scroll.
4. `overlay` is reserved for immersive routes. Map opts into it explicitly through `AppLayoutContentDirective`; the footer is compact, translucent/adaptive, fixed above the navigation and does not participate in layout height.
5. The activated route gets a non-shrinking `100dvh` shell boundary so adding the flow footer cannot reduce the first viewport of Home or any other route.
6. Footer surface colors continue to derive from the active `hero | plain` layout surface. No route-name selectors or feature-specific shell overrides.
7. Reuse one canonical CSS custom property for fixed-navigation clearance across routed body spacing and legal footer placement.
8. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [ ] Map workspace remains exactly one viewport high at 390x844 and 1440x900.
- [ ] Map legal links render in a compact overlay above the fixed bottom navigation without changing document/workspace height.
- [ ] Map overlay uses a translucent/adaptive surface and does not obscure the fixed navigation.
- [ ] Ordinary routes render the legal footer in document flow after a non-shrinking first viewport.
- [ ] At maximum scroll, ordinary-route legal links remain fully above and clickable despite fixed bottom navigation.
- [ ] Hero routes have no white/contrasting band between routed content and legal footer.
- [ ] Plain routes use the same muted surface family as routed content.
- [ ] Footer placement state unregisters cleanly during navigation.
- [ ] No horizontal overflow at mobile or desktop evidence viewports.
- [ ] Lint, Angular tests, deploy/build checks, legal browser QA and PR visual evidence pass on the exact product head.
- [ ] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Angular layout tests; `tests/playwright/legal-privacy.spec.ts`; existing `tests/playwright/map-exploration.spec.ts`; repository CI; legal browser QA; PR visual evidence; exact visual-regression comparison.

## Rollback

Revert the footer-placement/layout commits. No API, persistence, database or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Specified from user-provided Home and Map screenshots on 2026-08-30. Implementation and exact-head validation pending.
