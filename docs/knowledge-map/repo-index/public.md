---
title: Public Assets Index
intent: Document static files served directly without Angular bundling
tags: [assets]
last_scanned: 2026-08-31
source_of_truth: [public]
---
**When to use:** Confirm manifest and static asset locations outside Angular build pipeline.

# Files
- `favicon.svg` → User-approved independent Andalucia Transit identity: front-facing bus, stylized Andalusia outline and route stops, rendered with current theme colors. Also used as the general-purpose PWA icon.
- `app-icon-maskable.svg` → Full-canvas maskable copy of the same approved artwork; static tests require it to stay identical to `favicon.svg`.
- `manifest.webmanifest` → PWA manifest referencing install icons, startup background, and browser theme color.

# Branding constraints
- The app is not an official Junta de Andalucia application. Public assets must not include Junta logos, wordmarks, or other government identity that could imply endorsement.
- Binary/media exports are not committed. Icon artwork is maintained as native SVG in accordance with root `AGENTS.md`.

# Linked Shards
- PWA configuration: [`../components-index/overview.md`](../components-index/overview.md#pwa-shell).
- Service worker strategy: see root `ngsw-config.json` in [`root.md`](./root.md).
