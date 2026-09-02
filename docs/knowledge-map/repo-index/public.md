---
title: Public Assets Index
intent: Document static files served directly without Angular bundling
tags: [assets]
last_scanned: 2026-09-02
source_of_truth: [public]
---
**When to use:** Confirm manifest and static asset locations outside Angular build pipeline.

# Files
- `favicon.svg` → Sole browser favicon and PWA install-icon owner. The manifest uses this one asset for `any maskable` purposes. The current working source is exactly the colored SVG supplied by the user in commit `7560b1f261aeba68bb2c0bd3ab78726c05b2f796` and adopted at the canonical path by `2f6a456609c41b05971acb37f66eac90716fae7c`.
- `manifest.webmanifest` → PWA manifest referencing the canonical `favicon.svg`, current startup background, and browser theme color. There is no separate maskable artwork owner.

# Exact identity contract
- The approved artwork is a 1254×1254 single-support bus stop with a front-facing bus and an upper hanging clock on a dark navy/blue background.
- The supplied SVG Git blob is `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695`; its current UTF-8 SHA-256 is `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- Chromium rendering of that source into the contractual 1254×1254 canvas currently hashes to `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`.
- The authoritative approved RGBA SHA-256 remains `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`; zero differing pixels are required before the artwork is final.
- A bounded Chromium probe tested all 72 combinations formed from the source colors and known product theme values for navy, blue, white/background, and corners. All 72 produced unique hashes and none matched the authoritative digest. Do not continue arbitrary color brute force from the hash alone.
- Further artwork edits require the exact approved raster/reference pixels or an equivalent exact source so a real pixel diff can identify the remaining geometry/antialiasing/color deltas.
- Historical WebP payload chunks were incomplete and are no longer part of the implementation path after the user selected the SVG source; the obsolete chunk files have been removed.

# Branding constraints
- The app is not an official Junta de Andalucia application. Public assets must not include Junta logos, wordmarks, or other government identity that could imply endorsement.
- Root `AGENTS.md` forbids standalone binary/media exports in git history. The canonical repository artwork remains the text SVG; an exact raster reference may be used as external/test evidence when available rather than committed as a new media owner.

# Linked Shards
- PWA configuration: [`../components-index/overview.md`](../components-index/overview.md#pwa-shell).
- Service worker strategy: see root `ngsw-config.json` in [`root.md`](./root.md).
