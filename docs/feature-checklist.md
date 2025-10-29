# Feature Checklist

## 1. Overview
This checklist tracks the audited baseline of the Andalusia Transit platform and serves as the single roadmap for product, accessibility, and documentation work.
Update it after every audit cycle so the next iteration knows what is confirmed, what still needs verification, and which standards must never drift.

## 2. Verified Features (✅)
- Screenshot publishing pipeline – `npm run publish:evidence` consistently captures and uploads paired desktop/mobile screenshots to Filebin for every visual verification.
- Home dashboard tabs – Accessible button directive powers tab activation with consistent layouts across breakpoints and translation-backed labels.
- Stop detail timeline – Visual progress bar and status strings render as documented, with translations covering current states and no additional narration blocks.
- Route search workflow – Form submission, holiday-aware timetables, and query persistence align with the documented behavior in `AGENTS.md` and supporting docs.
- Offline and caching shell – Service worker configuration, manifest metadata, and cached favorites remain aligned with the documented offline strategy.

## 3. Pending or Incomplete Features (🚧)
- Home tab keyboard model – Arrow, Home, and End semantics need reintroduction with regression coverage so keyboard users retain predictable focus movement.
- Stop timeline narration – Define a restrained live-region announcement that summarizes progress updates without double-reading or translation gaps.
- Palette regression audit – Confirm tertiary and subdued text tokens meet WCAG AA after recent rollbacks removed darker contrast overrides.
- Evidence backlog – Refresh screenshot bins for favorites, route search, and settings views to guarantee published evidence matches the current UI.
- Documentation sync – Align component-level specs, audit backlog entries, and knowledge map shards with the restored baseline to avoid drift.

## 4. Accessibility and UX Standards (🧩)
- **Color Contrast:** Maintain WCAG 2.1 AA (4.5:1 for text, 3:1 for UI components). Adjust shared tokens before introducing local overrides.
- **Keyboard Navigation:** Preserve DOM-order tabbing; composite controls must provide arrow-key support, logical wrapping, and Escape handling where required.
- **Focus Management:** Keep focus rings visible and high contrast, restore focus after dynamic updates, and prevent traps except in modal contexts with explicit exits.
- **Screen Reader Narration:** Use meaningful labels, avoid duplicate announcements, and scope live regions narrowly to the content that changes.
- **Responsive Behavior:** Validate at ≥1280px (desktop), 768–1024px (tablet), and ≤414px (mobile) to ensure layouts remain legible without horizontal scrolling or clipping.
- **Evidence Capture:** Every visual change must ship with `publish:evidence` screenshots recorded in this checklist and linked in related documentation.

## 5. New Tasks / Next Steps (📋)
- Reintroduce tab roving focus with automated tests – Restore ARIA-compliant arrow/Home/End navigation for home dashboard tabs (accessibility + functional).
- Prototype a stop timeline live-region summary – Validate Spanish and English narration coverage for progress updates (accessibility + documentation).
- Audit tertiary typography contrast – Measure subdued labels across stop detail, favorites, and route cards against WCAG AA (visual).
- Refresh favorites, route search, and settings evidence – Capture new Filebin screenshots with `publish:evidence` to replace outdated bins (visual + documentation).
- Extend `docs/ui-theme.md` with color token guidance – Document contrast verification steps and token evolution rules for contributors (documentation).

> This checklist is maintained automatically after each audit cycle.  
> All verified features must be validated visually and functionally via `snap-and-publish` before being marked as complete.
