---
title: Public Assets Index
intent: Document static files served directly without Angular bundling
tags: [assets]
last_scanned: 2026-08-31
source_of_truth: [public]
---
**When to use:** Confirm manifest and static asset locations outside Angular build pipeline.

# Files
- `favicon.svg` → Current-theme browser favicon and general-purpose PWA icon.
- `app-icon-maskable.svg` → Full-canvas maskable PWA install artwork for platform-shaped launchers.
- `manifest.webmanifest` → PWA manifest referencing install icons, startup background, and browser theme color.

# Linked Shards
- PWA configuration: [`../components-index/overview.md`](../components-index/overview.md#pwa-shell).
- Service worker strategy: see root `ngsw-config.json` in [`root.md`](./root.md).
