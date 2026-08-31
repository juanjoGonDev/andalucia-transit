---
title: Core Layer Index
intent: Summarize global services, tokens, and i18n utilities
tags: [angular,core]
last_scanned: 2025-10-21
source_of_truth: [src/app/core]
---
**When to use:** Identify cross-cutting services or tokens shared across features.

# Files
- `config.ts` → Central app configuration constants.

# Directories
- `i18n/`
  - `pluralization.service.ts` and specs → Runtime pluralization logic for translations.
  - `pluralization.ts` → Helper rules consumed by the service.
- `interfaces/` → Language and package metadata contracts.
- `runtime/` → `runtime-flags.service.ts` reads `src/assets/runtime-flags.js` toggles.
- `services/`
  - `geolocation.service.ts` with options definitions and loader for nearby stops.
  - `language.service.ts` plus spec for locale switching.
  - `nearby-stops.service.ts` orchestrates stop discovery via loader.
- `tokens/` → DI tokens for app configuration and version injection.

# Linked Shards
- Data providers consuming these services: [`src-app-data.md`](./src-app-data.md).
- Components relying on localization: [`../components-index/overview.md`](../components-index/overview.md#localization).
