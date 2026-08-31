---
title: Public Assets Index
intent: Document static files served directly without Angular bundling
tags: [assets]
last_scanned: 2025-10-21
source_of_truth: [public]
---
**When to use:** Confirm manifest and static asset locations outside Angular build pipeline.

# Files
- `favicon.svg` → Default favicon displayed across platforms.
- `manifest.webmanifest` → PWA manifest referencing icons, theme colors, and shortcuts.

# Linked Shards
- PWA configuration: [`../components-index/overview.md`](../components-index/overview.md#pwa-shell).
- Service worker strategy: see root `ngsw-config.json` in [`root.md`](./root.md).
