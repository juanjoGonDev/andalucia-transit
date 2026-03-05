# Layout Guidelines

## Stop Timeline Card Rhythm
- **Breakpoint:** Apply tablet spacing adjustments from 48rem (768px) upwards while retaining compact mobile density below that threshold.
- **Padding:** `.stop-detail__list-item` must resolve to `var(--space-md)` (16px) on tablet and larger viewports; do not override within consumers.
- **Vertical Gap:** `.stop-detail__list` gap resolves to `var(--space-lg)` (24px) from 48rem upwards to align cards with home surface rhythm.
- **Tokens Only:** Border, background, and highlight treatments rely on palette variables (`var(--color-border)`, `var(--color-surface-muted)`, `var(--color-primary-soft)`); avoid rgba literals.
- **Verification:** Measure with devtools rulers at 1024×768 and confirm no text wrapping at 90% zoom. Re-run Playwright layout regression once updated (tracked in `tests/e2e/stop-detail.layout.spec.ts`).

## Evidence Logging
- Log textual evidence for desktop (1280×800), tablet (1024×768), and mobile (414×896) views.
- Record viewport, reproduction steps, selectors, measured spacing, and observed vs expected outcomes inside `docs/audit/stop-detail.md` together with QA steps.
