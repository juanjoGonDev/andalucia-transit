---
title: Public Assets Index
intent: Document static files served directly without Angular bundling
tags: [assets]
last_scanned: 2026-09-02
source_of_truth: [public]
---
**When to use:** Confirm manifest and static asset locations outside Angular build pipeline.

# Files
- `favicon.svg` → Canonical browser favicon and PWA install-icon path. The manifest uses this single asset for `any maskable` purposes. The current PR head still contains the rejected interim 512×512 bus + Andalusia-map vector artwork; it is not the approved final identity and remains guarded by the exact-pixel contract in `scripts/pwa-shell.test.ts`.
- `manifest.webmanifest` → PWA manifest referencing the canonical `favicon.svg`, current startup background, and browser theme color. There is no separate maskable artwork owner.

# Pending exact identity
- The approved final artwork is a 1254×1254 single-support bus stop with a front-facing bus and an upper hanging clock on a dark navy/blue background.
- Exact fidelity is authoritative: the embedded lossless WebP must hash to `5fe98391a9eed6de6cc7616a0604978063a270c79e7329cf137f3384ac2107be`, and Chromium-rendered RGBA at 1254×1254 must hash to `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- The canonical payload is currently incomplete in this PR: `payload-00.txt`, `payload-02.txt`, and `payload-03.txt` exist, while `payload-01.txt` was never committed. Do not replace the missing bytes with a regenerated or hand-traced approximation and do not weaken the pinned hashes.
- When the canonical bytes are recovered, they are embedded losslessly inside `favicon.svg` so the repository continues to store text/XML rather than a standalone binary media file.

# Branding constraints
- The app is not an official Junta de Andalucia application. Public assets must not include Junta logos, wordmarks, or other government identity that could imply endorsement.
- Root `AGENTS.md` forbids standalone binary/media exports in git history. Exact approved pixels therefore belong inside the canonical text SVG asset rather than in a committed PNG/WebP file.

# Linked Shards
- PWA configuration: [`../components-index/overview.md`](../components-index/overview.md#pwa-shell).
- Service worker strategy: see root `ngsw-config.json` in [`root.md`](./root.md).
