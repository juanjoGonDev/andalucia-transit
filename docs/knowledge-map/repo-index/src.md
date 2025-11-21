---
title: Src Directory Overview
intent: Map high-level Angular source entry points
tags: [repository,angular]
last_scanned: 2025-10-21
source_of_truth: [src]
---
**When to use:** Determine which shard covers a given source file inside `src/`.

# Contents
- `app/` → Angular application modules; see [`src-app.md`](./src-app.md).
- `assets/` → Static data, translations, runtime flags; see [`src-assets.md`](./src-assets.md).
- `index.html` → Document shell bootstrapping Angular app.
- `main.ts` → Application bootstrap logic.
- `styles/` → Global style partials; complements `styles.scss` entry.
- `styles.scss` → Primary global stylesheet.
- `types/` → Reusable TypeScript declarations for tooling.

# Related Shards
- Routing and shell composition: [`src-app-features.md`](./src-app-features.md).
- Data ingestion pipelines: [`src-app-data.md`](./src-app-data.md).
