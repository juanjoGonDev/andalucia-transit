---
title: Assets Directory Index
intent: Describe static datasets, translations, and runtime toggles
tags: [assets,data]
last_scanned: 2025-10-21
source_of_truth: [src/assets]
---
**When to use:** Locate bundled data files, translations, and configuration assets.

# Directories
- `data/`
  - `catalog/` → Consortium catalogs per region plus `index.json` for lookup.
  - `news/feed.json` → Snapshot of news items consumed by `news-feed.service`.
  - `snapshots/stop-services` → Schedule snapshots referenced by stop schedule services.
  - `stop-directory/` → Chunked stop metadata with `index.json` root and chunk subfolder.
  - `stop-directory.json` → Legacy flat file retained for compatibility.
- `i18n/`
  - `es.json`, `en.json` → Translation dictionaries for ngx-translate.

# Files
- `runtime-flags.js` → Injected script defining feature toggles consumed by `runtime-flags.service`.

# Linked Shards
- Data adapters using these assets: [`src-app-data.md`](./src-app-data.md).
- Data governance overview: [`../data-index/overview.md`](../data-index/overview.md).
