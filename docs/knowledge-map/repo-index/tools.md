---
title: Tools Directory Index
intent: Track standalone utilities supporting verification tasks
tags: [tooling]
last_scanned: 2025-10-21
source_of_truth: [tools]
---
**When to use:** Reference standalone TypeScript tools not bundled in Angular source.

# Files
- `verify-route-timetables.ts` → Validates generated timetables against business rules; complements snapshot outputs.

# Linked Shards
- Snapshot scripts generating timetables: [`scripts.md`](./scripts.md).
- Domain services consuming timetable data: [`src-app-domain.md`](./src-app-domain.md#route-search).
