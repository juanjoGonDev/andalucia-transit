# Andalucia Transit

Andalucia Transit is a Progressive Web App built with Angular and Angular Material to explore bus stops, routes, and schedules across the Andalusian transport network. It features a clean architecture layout, runtime language switching between Spanish and English, routing for core screens, and PWA capabilities for installability and offline caching.

The workspace ships with ESLint, Prettier, Jasmine/Karma unit testing, and Cypress end-to-end scaffolding. Run `npm start` for local development, `npm run build:prod` for a production bundle, `npm test` for unit tests, and `npm run e2e` for the Cypress smoke test.

## Quality checks

- `npm run lint` executes the ESLint suite with unused import detection and validates the dependency tree with Depcheck.
- `npm run lint:unused` runs the Angular ESLint pipeline with the unused import rules enabled.
- `npm run lint:deps` inspects the workspace for unused or missing npm packages.

## Media capture

- `pnpm run record` launches the Playwright-based recorder that captures screenshots and videos with the same DOM automation flow as the legacy screenshot utility. Refer to [docs/recording-guide.md](docs/recording-guide.md) for full flag descriptions and troubleshooting tips.
- Share demo captures via external links in pull request summaries or review comments, and remove local binaries after uploading.
