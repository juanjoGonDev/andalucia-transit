---
title: Public Assets Index
intent: Document static files served directly or transformed deterministically into deployment output
tags: [assets]
last_scanned: 2026-09-02
source_of_truth: [public]
---
**When to use:** Confirm manifest, static-asset ownership, and deterministic deployment-output rules outside Angular application code.

# Files
- `favicon.svg` → Sole repository/browser favicon and PWA install-icon source owner. The manifest uses this one asset for `any maskable` purposes. The working source is exactly the colored SVG supplied by the user in commit `7560b1f261aeba68bb2c0bd3ab78726c05b2f796` and adopted at the canonical path by `2f6a456609c41b05971acb37f66eac90716fae7c`.
- `manifest.webmanifest` → PWA manifest referencing the canonical `favicon.svg`, current startup background, and browser theme color. There is no separate maskable artwork owner.

# Source and deployment contract
- The repository source Git blob is `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695`; its UTF-8 SHA-256 is `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- `scripts/pwa-icon-output.ts` owns the deterministic build-output transformation. It removes only the exact XML declaration and final newline; it does not change the canonical repository source.
- The optimized deployed SVG is 15,146 bytes with SHA-256 `fef8eacd36fc0a37a8f17632ac680130ce256a3d2b46496028f62b26db07f514`.
- Chromium currently renders both the canonical source and optimized deployed output to RGBA SHA-256 `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b` on the contractual 1254×1254 canvas. The output optimization therefore preserves current rendered pixels.

# Exact identity contract
- The approved artwork is a 1254×1254 single-support bus stop with a front-facing bus and an upper hanging clock on a dark navy/blue background.
- The authoritative approved RGBA SHA-256 remains `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`; zero differing pixels are required before the artwork is final.
- The observed `7f0680a6...` render is not an acceptable replacement for `57aeab24...`. Static/browser contracts must remain fail-closed against the approved digest.
- A bounded Chromium probe tested all 72 combinations formed from source colors and known product-theme values. All 72 produced unique hashes and none matched the authoritative digest. Do not continue arbitrary color or geometry brute force from the hash alone.
- Further artwork edits require the exact approved raster/reference pixels or an equivalent exact source so a real pixel diff can identify remaining geometry, antialiasing, clipping, opacity, quantization, or color deltas.
- Historical WebP payload chunks were incomplete and are no longer part of the implementation path after the user selected the SVG source; the obsolete chunks have been removed.

# Branding constraints
- The app is not an official Junta de Andalucia application. Public assets must not include Junta logos, wordmarks, or other government identity that could imply endorsement.
- Root `AGENTS.md` forbids standalone binary/media exports in git history. The canonical repository artwork remains text SVG; an exact raster reference may be used as external/test evidence when available rather than committed as a new media owner.

# Linked Shards
- PWA configuration: [`../components-index/overview.md`](../components-index/overview.md#pwa-shell).
- Service worker strategy: see root `ngsw-config.json` in [`root.md`](./root.md).
