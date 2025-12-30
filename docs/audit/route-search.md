# Route Search Audit Notes

## Empty Result Guidance
- **Viewport:** Desktop 1366×768, Mobile 414×896
- **Reproduction:** Navigate to `/routes/a-7075-km-8-200--c4s592/to/acceso-a-albolote--c3s2/on/2025-10-31` or search for two stops from different consortia in Spanish and English locales.
- **Observed (pre-fix):** Result panel rendered an empty section without messaging or focus target, leaving keyboard and screen reader users without direction.
- **Resolved Behaviour:** Localized heading and description announce the absence of direct routes via a polite status region, and an "Adjust search filters" control returns focus to the origin field for quick edits.
- **Verification:** Manual narration checks in NVDA (ES/EN), `route-search.component.spec.ts` actionable-empty-state case, and Playwright suite `tests/playwright/route-search.empty-state.spec.ts` (skips unless `E2E_BASE_URL` is set).
