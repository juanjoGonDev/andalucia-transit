# UI Theme Tokens

## 2025-10-17
- Added `--color-primary-midnight` and `--color-primary-midnight-deep` to express the historical deep-blue gradient used by legacy home recent cards. These aliases ensure refactored shared cards can restore the exact baseline background without embedding raw hex values in feature styles.
- Added `--color-text-inverse-overlay-weak` and `--color-text-inverse-overlay-weak-strong` so inverse controls on dark gradients can match the legacy close-button overlays while remaining token-driven.
- Added `--shadow-recent-card-legacy` to capture the original recent card elevation (`0 6px 16px rgba(0, 0, 0, 0.25)`) required for pixel-parity regressions. Other components continue to use `--shadow-recent-card`.

## 2025-10-31
- Raised `--color-text-tertiary` to `#5a627b` after measuring the previous rgba mix at ~3.3:1 against `--color-background`. The new value lands at 5.65:1 on light surfaces while preserving the subdued intent. Documented verification steps in the contrast audit log and automated the threshold through unit and Playwright checks so regressions fail fast.
