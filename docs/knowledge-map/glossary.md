---
title: Knowledge Map Glossary
intent: Define recurring domain and technical terms
tags: [reference,glossary]
last_scanned: 2025-10-21
source_of_truth: [docs, src]
---
**When to use:** Clarify terminology encountered across shards, code, and docs.

- **CTAN** — Consorcios de Transporte de Andalucía, primary transit data provider.
- **AppShellComponent** — Shared layout host wrapping all routed feature content.
- **AppLayoutContentDirective** — Directive registering feature content with the shared layout context.
- **Snapshot pipeline** — Scripts generating static datasets under `src/assets/data/`.
- **Stop directory** — Chunked static index of stops consumed by `StopDirectoryService`.
- **Route timetable** — Aggregated schedule data built from CTAN timetable APIs and local snapshots.
- **Nager.Date** — External holiday API used for Andalusian observance detection.
- **Leaflet** — Mapping library powering interactive map and overlays.
- **Runtime flags** — Toggle definitions loaded from `src/assets/runtime-flags.js` controlling feature switches.
- **Accessible button directive** — Shared directive ensuring keyboard-accessible button behavior across custom elements.
