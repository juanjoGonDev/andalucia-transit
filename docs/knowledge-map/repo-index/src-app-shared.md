---
title: Shared Layer Index
intent: Capture reusable layout, accessibility, and UI primitives
tags: [angular,shared]
last_scanned: 2025-10-21
source_of_truth: [src/app/shared]
---
**When to use:** Discover shared directives, components, and services used across features.

# Directories
- `a11y/`
  - `accessible-button.directive.ts` (+ spec) → Keyboard-friendly button directive.
  - `key-event-matchers.ts` → Utility matchers for accessibility.
- `layout/`
  - `app-layout/`, `app-shell/`, `top-actions/` → Shell layout components with specs.
  - `app-layout-content.directive.ts`, `app-layout-context.store.ts`, `app-layout-context.token.ts` → Provide layout state.
- `map/`
  - `leaflet-map.service.ts` → Shared Leaflet integration helpers.
- `navigation/`
  - `navigation.util.ts` → Utilities for routing state and URLs.
- `ui/`
  - `cards/interactive-card` → Card component with spec.
  - `confirm-dialog/` → Confirmation dialog component.
  - `dialog/` → Dialog layout components and overlay service with specs.
  - `forms/` → Autocomplete, date picker, text field components and slot directive plus spec coverage.
  - `section/` → Section wrapper component.
  - `types/` → `material-symbol-name.ts` enumerating Material icon names.

# Linked Shards
- Feature usage examples: [`src-app-features.md`](./src-app-features.md).
- Accessibility strategy: [`../components-index/overview.md`](../components-index/overview.md#a11y-and-shared-ui).
