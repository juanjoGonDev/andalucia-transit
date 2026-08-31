---
title: Knowledge Map Overview
intent: Explain how to navigate the knowledge map shards
tags: [knowledge-base]
last_scanned: 2025-10-21
source_of_truth: [docs/knowledge-map]
---
**When to use:** Start here to understand the knowledge map purpose and required navigation order.

# Knowledge Map Purpose
- Central index for code, data, and documentation alignment without full-repo scans.
- Maintains shard-level pointers for fast lookup and drift detection.

# Usage Guidelines
- Always open [`index.md`](./index.md) before exploring other shards.
- Follow cross-links instead of running recursive searches; shards mirror repository structure.
- Update affected shards whenever code or docs change; refresh `last_scanned` dates after verification.
- Honor drift banners and change notes by prioritizing the referenced areas.

# Authoring Conventions
- Files use YAML front matter with `title`, `intent`, `tags`, `last_scanned`, and `source_of_truth`.
- Content stays terse with headings and bullet lists; no paragraphs longer than two lines.
- Each shard begins with a "When to use" signal.
- Relative links only; keep deterministic alphabetical ordering for lists.

# Maintenance Workflow
1. Run `git diff` since the recorded `last_scanned` date to detect changes.
2. Update relevant shards, cross-links, and `index.json`.
3. Mark suspected misalignments with the drift banner and leave TODOs in source, not here.
4. Record planned work using change notes blocks as instructed in feature docs.

# Alignment Signals
- Drift banner: `> ⚠ Needs Review: ...` when summaries fall out of sync.
- Planned change block: `Planned Change: ...` describing upcoming refactors.
- Deprecated callout: `Deprecated: ...` with replacement pointers.

# Checklist for Editors
- Confirm new artifacts are discoverable from `index.md` in ≤3 clicks.
- Verify links resolve and shard sizes stay compact.
- Sync updates with AGENTS.md so automation and humans rely on consistent guidance.
