---
title: Screenshot Publishing Audit
status: Verified
recorded: 2025-10-29
scope: tooling
---

## Overview
The publish evidence automation captures desktop and mobile screenshots through `npm run publish:evidence` which wraps `scripts/record.js`, saves PNG files under `artifacts/screenshots`, and uploads them to Filebin with enforced PNG metadata.

## Procedure
1. Executed `npm run publish:evidence -- --url http://localhost:4200 --label "Home Recents Action" -- --scenario=publish-home-recents` against the mock data environment.
2. Monitored streamed record.js events to confirm scripted interactions completed.
3. Validated the generated files under `artifacts/screenshots` before upload.
4. Verified Filebin responses included `image/png` content-type for each asset.

## Evidence
Home Recents Action – AFTER  
after (desktop): https://filebin.net/ngbqjnow8mdmhb18/home-recents-action-2025-10-28T20-42-03-535Z_es_1280_800_full.png  
after (mobile): https://filebin.net/ngbqjnow8mdmhb18/home-recents-action-2025-10-28T20-42-03-535Z_es_414_896_full.png

Route Search Action – AFTER  
after (desktop): https://filebin.net/gouqlj2efdsmhb1a/route-search-action-2025-10-28T20-43-05-401Z_es_1280_800_full.png  
after (mobile): https://filebin.net/gouqlj2efdsmhb1a/route-search-action-2025-10-28T20-43-05-401Z_es_414_896_full.png

Favorites Tab Action – AFTER  
after (desktop): https://filebin.net/mhd5qlzvb5mhb1b8/favorites-tab-action-2025-10-28T20-43-54-950Z_es_1280_800_full.png  
after (mobile): https://filebin.net/mhd5qlzvb5mhb1b8/favorites-tab-action-2025-10-28T20-43-54-950Z_es_414_896_full.png

## Follow-up Actions
- Refresh captures whenever the home, route search, or favorites surfaces change visually.
- Extend scenarios in `scripts/scenarios` to cover stop detail and map interactions.
