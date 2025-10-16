# Feature Checklist

- [x] Display route search results as a unified list of bus departures after submitting the form.
- [x] Return accurate schedules for future dates without falsely reporting missing services.
- [x] Keep the route search form populated on the results view so travelers can refine queries in place.
- [ ] Maintain a consistent navigation layout and responsive timeline presentation across all views.
- [x] Detect Spanish national and Andalusian public holidays to adjust route timetables and highlight festivo coverage.
- [x] Mirror Andalusian observed holidays by treating Monday as festivo when the official date falls on Sunday.

## UI Refactor – Unified Design System
- [ ] Define theme tokens and global CSS utilities (buttons, forms, surfaces)
- [ ] Replace old UI components with unified primitives
- [ ] Remove duplicated buttons, inputs, and modals
- [ ] Implement a single reusable Dialog system
- [ ] Ensure all components respect the primary palette
- [ ] Verify accessibility and translation integration
- [ ] Update docs/ui-theme.md after completion
