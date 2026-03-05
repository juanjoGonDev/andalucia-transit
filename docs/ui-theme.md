# UI Theme Tokens

## 2025-10-17
- Added `--color-primary-midnight` and `--color-primary-midnight-deep` to express the historical deep-blue gradient used by legacy home recent cards. These aliases ensure refactored shared cards can restore the exact baseline background without embedding raw hex values in feature styles.
- Added `--color-text-inverse-overlay-weak` and `--color-text-inverse-overlay-weak-strong` so inverse controls on dark gradients can match the legacy close-button overlays while remaining token-driven.
- Added `--shadow-recent-card-legacy` to capture the original recent card elevation (`0 6px 16px rgba(0, 0, 0, 0.25)`) required for pixel-parity regressions. Other components continue to use `--shadow-recent-card`.

## 2025-10-31
- Raised `--color-text-tertiary` to `#5a627b` after measuring the previous rgba mix at ~3.3:1 against `--color-background`. The new value lands at 5.65:1 on light surfaces while preserving the subdued intent. Documented verification steps in the contrast audit log and automated the threshold through unit and Playwright checks so regressions fail fast.

## Contrast Token Regression Checklist
1. Measure contrast for updated tokens against their intended backgrounds using the browser accessibility panel and record the ratio values.
2. Verify the affected views at desktop (1280×800), tablet (1024×768), and mobile (414×896) to confirm visual parity and no unintended overrides.
3. Run the automated checks that guard theme contrast (`src/styles/theme-rules.spec.ts` and `tests/playwright/theme.contrast.spec.ts`).
4. Record textual evidence in `docs/audit/contrast-report.md`, including viewports, selectors, contrast ratios, and observed vs expected outcomes.
