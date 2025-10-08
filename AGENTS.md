### Change Management - Living Document
AGENTS.md is the canonical decision log. When implementation, tooling, workflows, legal obligations, or conventions change, update this file in the same pull request or align the code with what is written here. Keep entries concise and link to supporting material in `docs/`.

## Product Vision & User Value
- Progressive Web App for the Andalusia (CTAN) public transport network that surfaces stop schedules, nearby stops, direct routes, and an explorable map.
- Optimized for mobile-first usage with installable PWA behavior, offline fallbacks, and bilingual UX (Spanish default, English available).

## Core Features
- **Home dashboard:** favorites, recent stops, search, and GPS-powered nearest stop (requires explicit consent prompt).
- **Stop detail:** next departures with filters by date/time/destination plus accessibility indicators when provided by CTAN.
- **Route search:** direct-route planning between valid stop pairs with daily timetable context.
- **Map view:** Leaflet + OpenStreetMap with viewport-driven loading and clustering; markers navigate to stop detail.
- **Offline support:** cache app shell and lightweight data (favorites, recent schedules) with clear refresh cues and storage limits.

## Tech Stack & Tooling
- Angular (latest stable; current workspace on Angular 20) with TypeScript, Angular Material, RxJS, and standalone component architecture.
- @angular/pwa for service worker + manifest, ngx-translate for runtime i18n, Leaflet (or ngx-leaflet) for mapping.
- Node.js LTS + npm, ESLint + Prettier, Jasmine/Karma unit tests, Cypress end-to-end tests.
- Configuration via Angular environments; HttpClient handles API access; commit messages in English.

## Architecture & Code Guidelines
- Clean/hexagonal layering: presentation components -> domain services/utilities -> infrastructure adapters (API, storage).
- Prefer small, single-responsibility services; share state through RxJS streams or signals; isolate pure logic in domain utilities.
- Define data contracts with TypeScript interfaces; keep constants in dedicated config modules; avoid magic numbers/strings.
- Use Angular DI and factory providers for abstractions; rely on OnPush change detection where possible; tear down subscriptions via `async` pipe or `takeUntil`.
- Follow English naming, 2-space indentation, semicolons, and avoid redundant comments or commented-out code.

## Documentation & Knowledge Base
- Store extended research, diagrams, and legal templates under `docs/`. Reference relevant assets here instead of duplicating prose.
- `docs/api.html` contains a static snapshot of the CTAN open data portal describing all consumed API endpoints. Refresh it when the upstream site changes and note the update in this file.
- `docs/api-reference.md` summarizes every CTAN REST endpoint and cross-references shared parameters for planning data combinations; keep it current when the upstream API evolves.
- Add new documentation artifacts in `docs/` alongside a short pointer in AGENTS.md for discoverability.
- Track feature work using the checklist at `docs/features-checklist.md` and update entries as scope evolves.

## Security & Privacy Practices
- Angular safety: rely on Angular template sanitization; do not use direct DOM APIs or `DomSanitizer.bypassSecurityTrust*` unless reviewed and documented; never evaluate dynamic scripts or HTML.
- Validate and encode all user-provided values; escape parameters passed to third-party libraries; use `Renderer2` for DOM manipulations.
- Enforce HTTPS-only requests; handle HTTP errors centrally with interceptors; scope service workers narrowly and avoid caching sensitive payloads.
- Apply route guards for privileged views (future-proofing), and keep client storage limited to non-sensitive preferences.
- GitHub Actions: trigger workflows only on repository-owned branches; guard against fork execution (`if: github.event.repository.fork == false`); set `permissions` to the minimum required (e.g., `contents: read`, `id-token: write` only when needed); require manual approval for deployment jobs; keep secrets in repository settings and never expose them to forked PR contexts.

## Data Usage & External APIs
- Primary data source: CTAN Open Data (`https://api.ctan.es`). Reuse terms require:
  - Do not alter the meaning of the information.
  - Cite the source and retrieval date in reports: "Informacion obtenida a traves del Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucia."
  - Cite the source within the app when linking to CTAN data: "Informacion proporcionada por el Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucia."
  - Do not imply CTAN or Junta de Andalucia endorse or support this application.
- Document any additional external services before integration and record their licensing or usage limits.
- Cache CTAN responses sparingly, respect freshness windows, and provide manual refresh to correct stale data.
- Home search and stop metadata now rely on `StopDirectoryService`, which loads the generated snapshot index at `assets/data/stop-directory/index.json`; remove mock network usages in new code.
- Daily snapshots produce a stop directory index at `assets/data/stop-directory/index.json` with chunked stop files under `assets/data/stop-directory/chunks/` to keep the initial payload light; `StopDirectoryService` streams the index and only fetches chunk files when a stop record is needed.
- `assets/data/catalog/` stores consortium datasets (municipalities, nuclei, lines) for the entire CTAN network so features can hydrate localized pickers without refetching the API.
- `.github/workflows/daily-snapshot.yml` generates transport snapshots every day at 05:00 Europe/Madrid, commits changes with the `PAT_FINE` token, and auto-merges refreshed data. Keep snapshot scripts green (`npm run snapshot`, `npm run test:scripts`).

## Legal & Regulatory Compliance
- **GDPR / RGPD (Reglamento UE 2016/679 & LO 3/2018):** collect only necessary data; geolocation requires explicit browser consent and an in-app explanation; publish an accessible privacy notice covering controller identity, processing purposes, lawful basis, retention, third parties (none by default), and user rights (access, rectification, erasure, restriction, portability, objection). Document procedures for handling rights requests and reporting personal data breaches within 72 hours.
- **Accessibility (Real Decreto 1112/2018, BOE-A-2018-12699 & EN 301 549):** maintain WCAG 2.1 AA compliance (structure, contrast, keyboard support, focus management, ARIA roles, language attributes). Provide an accessibility statement in `docs/`, perform automated (axe, Lighthouse) and manual audits, and track remediation tasks.
- **Additional obligations:** serve the app over HTTPS, provide legal notice/contact information, and ensure cookies or analytics (if added) respect EU ePrivacy consent rules.

## PWA, Offline, and Caching Strategy
- Manage caching via `ngsw-config.json`: precache the app shell, set data groups with conservative `maxAge` (e.g., stops list daily, stop schedules minutes), and use stale-while-revalidate patterns where appropriate.
- Surface offline status to the user and allow re-sync when connectivity returns; budget storage to avoid exceeding quota on mobile devices.
- Maintain the web app manifest with localized strings, icons, and display options; verify installability on Chrome/Edge and document iOS add-to-home instructions.

## Internationalization
- Use `@ngx-translate/core` with JSON dictionaries under `src/assets/i18n` (at minimum `es` and `en`); default to Spanish when user locale is unsupported.
- Reference translation keys in templates (`| translate`); include pluralization/interpolation in dictionaries; keep UI text out of components.
- When adding features, update translations and manually verify language switch flows before merging.

## Testing & Quality Workflow
- Practice TDD for domain logic and services; create failing unit tests before implementing new behavior.
- Unit tests: Jasmine/Karma with Angular TestBed; mock HttpClient and translation services; cover edge cases (empty API responses, offline handling).
- E2E tests: Cypress scenarios for home load, stop detail, route search, map interaction, offline mode, and language switching.
- Static analysis: run `npm run lint`, `npm run format:check`, and type-checking in CI; fail builds on lint, test, or coverage regressions.
- Track Lighthouse scores for performance, accessibility, best practices, and SEO; gate releases on meeting agreed thresholds.
- Break complex product goals into smaller verifiable tasks and validate each step before progressing to the next.

## Performance & UX Guardrails
- Leverage lazy-loaded routes and code splitting; reuse API results with RxJS `shareReplay` or caching services; offload heavy computations (e.g., nearest stop calculations) to Web Workers if needed.
- Keep map rendering efficient via clustering and viewport filtering; dispose of subscriptions and event listeners to prevent leaks.
- Ensure responsive layouts with Angular Material breakpoints; validate on low-end Android devices, desktop, and offline contexts.

## Operational Snapshot
- Workspace: `andalucia-transit` Angular standalone project with `core`, `data`, `domain`, `features`, and `shared` directories under `src/app`.
- Configuration constants live in `src/app/core/config.ts`; translation assets reside in `src/assets/i18n/`; service worker and manifest managed through Angular CLI.
- Use English commit messages, avoid force pushes to main, and document notable architectural changes here and in `docs/`.
