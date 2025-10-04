Project Overview

This project is a Progressive Web App (PWA) for browsing public bus schedules and stops in the Andalusia transport network. It allows users to find upcoming bus times at a given stop, locate nearby bus stops via GPS, search for routes between an origin and destination, and view all stops on an interactive map. The application is built with a focus on clean architecture and code quality: we will apply TDD (Test-Driven Development), SOLID principles, and clean code practices throughout. The app will support multiple languages (Spanish and English initially), defaulting to Spanish if the user’s language is not recognized. It will directly consume the open data API of the Red de Consorcios de Transporte de Andalucía (CTAN) for transit data
api.ctan.es
api.ctan.es
, meaning no custom backend is required. As a PWA, it will be installable and include offline capabilities (caching assets and possibly schedule data) for a good mobile user experience.

Features

Home (Bus Schedules Overview): A clean start screen showing recent stops (history), a quick option to find the nearest stop via GPS, and a list of user-favorite stops. Users can quickly access stops they use frequently. There may also be a search bar to look up stops by name.

Bus Stop Detail: When a stop is selected, the app displays detailed arrival times for upcoming buses at that stop. The next imminent bus is highlighted, and recently passed departures might be shown for context. Users can filter the view by date (choose a specific day’s schedule), by time (e.g. show times after a certain hour), or by destination (especially if multiple lines serve the stop in different directions). An accessibility icon is shown next to any bus that is wheelchair-accessible (this info is provided by the API data if available). The UI is designed to clearly distinguish upcoming buses from those just passed.

Route Search (Origin/Destination): The app provides a form where the user can select an origin stop and a destination stop (with auto-suggestion, limited to valid stops). After choosing origin and destination, the app will determine which bus routes can take the user from the origin to the destination. It will only allow selecting destinations that are reachable via at least one direct route from the chosen origin (no multi-transfer planning initially, just direct lines). The user can also select a date (defaulting to today) for which to view the schedule. The result will show one or more possible bus lines and their timetable or next departure times that go from the origin to the destination. This helps the user plan a trip by bus between two specific points.

Bus Stops Map: An interactive map screen that displays bus stop locations. As the user pans or zooms the map, stops within the visible area load progressively (to avoid loading all stops at once). This allows exploring the transit network geographically. The map uses clustering or progressive rendering if there are many stops. Tapping on a stop marker can show the stop name and an option to view its detailed schedule. We will use an open source mapping solution (e.g. Leaflet with OpenStreetMap data) to avoid external API keys. Markers will load in as the map moves, preventing performance issues with thousands of points.

PWA & Offline Support: The app is a PWA, so users can install it on their device. It will include a web app manifest (name, icons, theme color) and a service worker for offline caching. The core application shell (HTML/JS/CSS) will be cached, so it loads without internet after first use. Additionally, the app will cache certain API responses (like the list of stops, or schedules for favorite stops) in a small local storage or indexed DB, so that some data is available offline or to minimize network calls. We will implement a strategy to limit cached data size (only storing recent or favorite information) to keep the storage footprint reasonable. By leveraging caching and offline storage, the app can provide basic functionality even with limited connectivity (for example, viewing a saved schedule retrieved earlier).

Multi-Language Interface: The user interface supports Spanish and English out-of-the-box, and is built to be easily extendable to other languages. It will detect the user’s browser language on first load – if it’s Spanish or English, the app will use that; otherwise it will default to Spanish. All static text in the UI is externalized to localization files, so no user-facing strings are hard-coded. This ensures easy maintenance of translations and consistent language switching.

Tech Stack

Framework: Angular (latest version) with TypeScript. This choice provides a structured environment (useful for a backend developer unfamiliar with frontend) and built-in support for things like routing, form handling, and a strong typing system. Angular’s architecture aligns well with clean coding practices and has a powerful CLI for project scaffolding and building.

PWA Support: Angular’s PWA capabilities (via @angular/pwa) will be used to generate the service worker and manifest. This gives us offline caching and installability out of the box.

UI Components: We'll use Angular Material to speed up UI development and ensure a polished, accessible design. Angular Material provides pre-built components (lists, dialogs, buttons, date pickers, etc.) that follow Google’s Material Design and are generally accessible. This will help implement things like the date picker for selecting schedule date, or responsive layout, without building from scratch.

Mapping: Leaflet (with OpenStreetMap tiles) for the map view. Leaflet is lightweight and doesn’t require an API key. We can use an Angular wrapper (e.g. ngx-leaflet) or integrate it directly. This will display stop markers and handle user interactions on the map.

HTTP Client: Angular’s built-in HttpClient for API calls to the CTAN endpoints. This will handle JSON data fetching and allow easy integration with RxJS for asynchronous data streams (e.g., fetching and caching).

Internationalization: We’ll integrate a library such as ngx-translate (or Angular’s built-in i18n if we choose that route, though ngx-translate offers dynamic language switching). This allows us to load translation JSON files for each language and switch at runtime. All text will be referenced via translation keys.

State Management: For simplicity, we can manage state with Angular services and RxJS (e.g., a service to hold the list of stops in memory, a service for user preferences like favorites). Given the app’s scope, a full NgRx store might be overkill, but we will still organize stateful logic cleanly in services to avoid tightly coupling components.

Testing Frameworks: Jasmine and Karma for unit tests (these come by default with Angular CLI). We will use these for TDD, writing spec files for our components and services. For end-to-end testing, we can use Cypress or Protractor (Angular’s traditional e2e tool) – Cypress is preferred for its modern capabilities. Tests will ensure that features work and help maintain code quality.

Tooling: Node.js (LTS version) and npm as the build tools. The Angular CLI will handle most build/test tasks. We will use ESLint (with Angular’s recommended config) to enforce code style and catch issues, and possibly Prettier for consistent code formatting. Git will be used for version control, with commits written in English and following meaningful message guidelines.

Setup and Installation

To set up the development environment and run the project, follow these steps:

Prerequisites: Make sure you have Node.js (v16 or above) installed. Install the Angular CLI globally with npm install -g @angular/cli. You’ll also need a package manager (npm comes with Node, or yarn if preferred).

Clone the Repository: Retrieve the project source code (initially just this AGENTS.md and subsequently the Angular app code) from the repository. Then navigate into the project directory in your terminal.

Install Dependencies: Run npm install to install all required packages for the project.

Development Server: Start the app in development mode with ng serve. This will compile the Angular application and launch a dev server (by default at http://localhost:4200). The app will automatically reload on code changes.

Running Tests: Execute ng test to run the unit test suite. This will launch Karma and run all specs in watch mode. Ensure that all tests pass (we’ll be writing comprehensive tests as we develop). For end-to-end tests, if configured, run ng e2e (or the appropriate command if using Cypress).

Linting: Run ng lint to analyze the code with ESLint for any style or code quality issues. The linter will enforce our coding standards (such as no unused variables, etc.).

Building for Production: Use ng build --configuration production to generate an optimized production build. The output will be in the dist/ directory, ready to be deployed. This build will include the service worker (for PWA) and will be minified for performance.

PWA Testing: After building, you can serve the dist/ output (for example, using a simple HTTP server) to test PWA features. Open the app in Chrome and use DevTools to verify that the service worker is registered and that the app can work offline (after initial load). Also test the install prompt by clicking the install icon in the address bar or via DevTools (Application > Manifest).

Project Structure and Architecture

We will structure the project following Angular’s standard conventions, enhanced by a Hexagonal Architecture approach to separate concerns:

Source Code Layout: All source code will reside in the src/ directory of the Angular project.

/src/app/ will contain the application code.

We will organize features into modules or at least separate directories. For example, we might have home/, stop-detail/, search/, and map/ directories for the four main features, each containing components and possibly child components for that section.

Components: Each UI component (page or widget) will have its own .component.ts TypeScript file, an HTML template, and a CSS/SCSS file for styles. Components will be named in PascalCase and file names in kebab-case (e.g., stop-detail.component.ts, as per Angular style guide).

Services: We will have dedicated services to handle business logic and data. For instance, a DataService (or multiple services like StopService, LineService) to fetch data from the API, a LocalizationService for handling language changes, and maybe a StorageService for local storage operations (favorites, recent stops). Services will be provided in the application’s dependency injection so they can be easily used and mocked in tests.

Models: Define TypeScript interfaces or types for the data models (e.g., Stop, Line, ServiceSchedule). This helps keep the code type-safe and clear. For example, when we fetch stops from the API, we map to a Stop interface with fields like id, name, latitude, longitude, etc.

Utilities: Any complex logic that can be made into pure functions (for example, a function to calculate the nearest stop given a latitude/longitude, or a function to filter schedule results) will be placed in utility modules or service methods, separate from the components. This aligns with single responsibility and makes such logic easily testable.

Routing: Angular Router will manage navigation between views. We’ll define routes for the main pages (home, stop detail, map, etc.) in an AppRoutingModule. Each route will load the corresponding component, possibly with route parameters (e.g., the stop detail page route might include the stop ID in the URL).

State & Data Flow: We will follow a clear separation: components are primarily responsible for presentation (UI rendering and user interaction handling), while services handle data retrieval and business logic. Components will subscribe to Observables from services or call service methods to get data, but they won’t implement low-level logic themselves. This keeps components lean (“smart” vs “dumb” component separation, where appropriate).

Hexagonal Architecture: We treat external data sources (the CTAN API, browser localStorage, etc.) as outside the core logic. The core of our app (the business rules like filtering schedules, determining route connections, etc.) will not depend directly on these external details. For example, we might define an abstract repository interface for fetching data (stops, lines, times) and have the implementation in our data service which calls the API. This way, the core logic could be tested with a mock repository without real API calls. In practice, since this is a frontend app, we will implement this by clearly separating modules: e.g., a data layer (API services) and a domain layer (maybe part of services or separate utils) that operates on the data. Angular’s DI makes it easy to swap implementations if needed (for instance, in tests we can provide a mock DataService). This approach ensures dependency inversion – high-level modules (like components or domain logic) do not directly depend on low-level modules (like HTTP calls).

Environment Configuration: The Angular project will have environment config files (e.g., environment.ts for development and environment.prod.ts for production). We will use these to store environment-specific settings, such as the base URL for the API and possibly the default consorcio (area) code. For instance, we can define API_BASE_URL = "https://api.ctan.es/v1/Consorcios/1" (with 1 being the code for Seville’s consorcio
api.ctan.es
). If we ever want to support a different region, we can change or make this configurable. Keeping such constants in the environment file avoids magic strings in code and makes it clear and centralized.

Local Data Storage: The app will use the browser’s local storage (or IndexedDB for larger data) to store some data locally:

Favorites and recent stops will be saved in localStorage (since these are user-specific small pieces of data). We’ll provide a service (e.g., FavoritesService) to abstract these operations (so that components simply call methods like addFavorite(stopId) or getRecentStops()).

Cached API data: we might store the full list of stops or line details in memory when fetched, to avoid repeated calls. If needed, we could also persist some of it in IndexedDB for offline use (for example, caching the stops list or last viewed schedules). However, we will implement caching carefully to respect storage limits and data freshness. The goal is to automate data extraction and storage in a way that improves performance but limits size. For instance, if we fetch the stops list (which is ~5k stops for all consorcios, less if just one area
api.ctan.es
), we can cache it so that subsequent uses (like search or nearest stop calculation) don’t hit the network repeatedly. We will monitor size (a few thousand stops in JSON should be on the order of a few hundred KB, which is fine). For schedule data, we might cache only for the current session or a short time, since schedules can change daily.

Scalability: By following SOLID principles (especially Single Responsibility and Open/Closed), the code will be organized into many small, focused units (classes or functions). Each component or service should have a clear purpose. This makes it easier to extend or modify functionality without breaking other parts (Open/Closed principle). For example, if we later add a new feature (like real-time bus tracking), we can add new services or components without heavily altering the existing ones.

Dependency Injection: Angular’s DI will be used to manage service instances. This promotes loose coupling. For instance, our API data service can be injected wherever needed; in unit tests, we can inject a fake service instead to simulate API responses. This makes testing and future maintenance easier (Dependency Inversion principle in practice).

Error Handling: We will ensure that the app handles errors gracefully. If an API call fails (network error or server error), the services will catch the error and possibly return a user-friendly message or fallback value. The UI can then display an error message (in the user’s language) instead of just failing silently or crashing. This is important for a good user experience, especially in a PWA that might be used with poor connectivity.

In summary, the architecture is layered: Components (UI) -> Services (data/domain logic) -> API (external). Within this, we aim to keep our core logic (filtering, computing nearest stops, etc.) as pure as possible, while the outer layer handles side effects (HTTP calls, local storage, etc.). This maximizes testability and maintainability.

Code Style & Best Practices

We will adhere to strict code style rules and best practices to ensure the code is clean, understandable, and maintainable:

General Style: All code will be written in English – this includes variable names, function names, class names, and any comments or documentation. We follow Angular/TypeScript conventions (e.g., using camelCase for variables and functions, PascalCase for classes and components, consistent indentation and bracket placement). We will utilize linters/formatters (ESLint, Prettier) to enforce a consistent style (for example, 2-space indentation, semicolons, quotes, etc., based on Angular’s default style guidelines).

SOLID Principles: We actively apply SOLID design principles:

Single Responsibility: Each component or service should have one clear responsibility. If a function is doing “too much,” it will be refactored into smaller functions. For example, a function to fetch and format schedule data might be split into one function that fetches raw data and another that formats it.

Open/Closed: The design should allow extension without modifying existing code. For instance, if we add a new data source or support a new API, we might create a new service implementing a common interface rather than changing the core logic.

Liskov Substitution: We’ll program to interfaces where it makes sense (especially for the data layer), so that any implementing class can be substituted. In Angular, DI plus TypeScript interfaces will help with this.

Interface Segregation: We avoid “fat” interfaces. Our data models and service interfaces will be specific to what the client needs. For example, if there’s an interface for a repository, it will have fine-grained methods (getStopTimes, getLineStops) rather than one huge method that does everything.

Dependency Inversion: High-level modules (components, business logic) do not directly depend on low-level modules (HTTP, storage). We depend on abstractions. This is achieved by Angular’s dependency injection of services and using wrappers for APIs or storage. This makes modules interchangeable for testing or future changes.

Clean Code Practices: We strive for readability and clarity:

Use meaningful names for all variables, functions, and classes. Names should clearly indicate purpose (e.g., calculateNextArrival() instead of func1()).

Keep functions small and pure whenever feasible. If a function can avoid side effects, it should (return a value instead of modifying external state). Pure functions (especially for calculations like finding nearest stop or filtering schedules) will be favored, as they are easier to test and reason about.

Avoid deep nesting of loops or conditionals. We will use early returns to handle error cases or simple conditions, thereby preventing multiple layers of indentation. This makes the code flatter and easier to follow.

No Magic Numbers/Strings: We will not hard-code important values or strings in multiple places. All significant constants (e.g., API URLs, default values like “5” for a list limit, etc.) will be defined as constants or configuration. For example, the default refresh interval, maximum cache size, etc., would be defined in one place. The only exception might be trivial literal values used directly in log messages or obvious contexts. By avoiding magic numbers, we make the code self-documenting and easy to change.

Minimal Comments: We aim to write code that is self-explanatory through clear naming and structure. Comments in code will be added only when necessary to explain non-obvious logic or complex algorithms. If everything is straightforward, we prefer no comment over a redundant comment. When used, comments will be concise and explain the “why” if the code’s intent isn’t immediately clear. We avoid commented-out code; version control should handle history.

Error and Edge Handling: We will consider edge cases (no internet, API returns empty, etc.) and handle them in code. This includes checking for undefined or null where needed, using default values, and not assuming API will always return data. Defensive coding ensures robustness.

Logging: During development, we may use console.log for debugging but these should be removed or replaced with proper logging mechanisms in production mode if needed. If any logging remains, it will not contain sensitive data and will be in English. (Magic strings in logs are acceptable for clarity of message.)

Testing-Driven Development: We embrace TDD. Before or as we implement a feature, we will write unit tests that specify the expected behavior. For example, we’ll write tests for the function that determines which routes connect two stops, tests for the nearest stop calculation, and tests for components (using Angular’s TestBed to check that when a service returns certain data, the component displays it correctly). We will ensure high test coverage for critical logic. This practice will drive better design (since code written to be testable is usually more modular and decoupled) and prevent regressions.

Git and Commit Practices: Although not directly code style, it’s worth noting that we will use version control best practices. Commits should be atomic and have descriptive messages (in English) explaining the change. If using pull requests, they should be reviewed with these standards in mind.

Performance and Cleanliness: We will keep performance in mind – for instance, unsubscribing from Observables in Angular components to prevent memory leaks, using OnPush change detection for components when appropriate to optimize UI updates, and avoiding any heavy computations on the main thread where unnecessary (for example, if processing large data, consider Web Workers or efficient algorithms).

Accessibility: Following best practices also means ensuring the app is accessible. Using Angular Material helps, but we will also add appropriate ARIA labels, alt texts for icons (like the accessibility icon will have an accessible description), and ensure keyboard navigation works for key features. Clean code extends to HTML/CSS – we will use semantic markup and keep styles modular (SCSS) with a clear structure.

By adhering to these guidelines, the codebase will be maintainable in the long run and easier for anyone (or any AI agent) to understand and contribute to.

Internationalization (i18n)

Internationalization is a first-class consideration for this project. The app will support Spanish (es) and English (en) initially, with the infrastructure in place to add more languages easily. Here’s how we’ll implement i18n:

Language Files: We will maintain separate JSON translation files for each language. For example, an assets/i18n/es.json for Spanish and assets/i18n/en.json for English. These files will contain key-value pairs where keys are message identifiers (in English or a code) and values are the translated strings. For instance: "HOME_TITLE": "Horarios de Autobuses", in Spanish and "HOME_TITLE": "Bus Schedules", in English.

Default Language: On app startup, we will detect the user’s preferred language (usually via navigator.language or navigator.languages in the browser). If it starts with “es” (Spanish) or “en” (English), we use the matching language. If it’s some other language (or cannot be determined), we default to Spanish as requested. This default can be easily changed in configuration, but per requirements, Spanish will be the fallback if an unknown locale is encountered.

Language Switching: We will use a library (like ngx-translate) that allows dynamic language switching at runtime. The app will load the default language, but we will also provide an option (maybe a settings menu or a simple toggle) to switch language manually, so users can override the detection if needed. This is useful for testing and for bilingual users.

Implementing Translations: All text in component templates will be placed through translation pipes or directives. For example, in Angular with ngx-translate, we’d use {{ 'HOME_TITLE' | translate }} in the template. We will avoid hardcoding any user-visible text in the templates or code. Even error messages or alert dialogs will use the translation service. The only exceptions are possibly console logs or internal exceptions which can remain in English since they are for developers.

Extensibility: To add a new language in the future, one would just create a new JSON file (say fr.json for French), add it to the assets, and include it in the translation initialization. Our code will be written to not assume only two languages, even though we ship with two. For example, if using ngx-translate, we can set up an array of supported languages and loop through that for any language selection UI. The architecture separates text resources from code, so adding a language doesn’t require code changes, just new resource files (plus translating the strings).

Pluralization and Variables: If there are any dynamic messages (e.g., “X minutes until arrival”), we will utilize the i18n library’s features for pluralization or interpolation. This ensures grammatically correct messages in each language. (For example, English might be “1 minute” vs “5 minutes”, Spanish “1 minuto” vs “5 minutos” – translation files or Angular i18n can handle these variations.)

Date/Time Localization: The app deals with times (bus schedules). We will ensure that date and time formats are localized. Angular’s DatePipe can format dates according to locale. We will set the app’s locale to Spanish or English accordingly (Angular requires importing locale data for languages, e.g., registerLocaleData(localeEs) for Spanish). This means that if we display a date or time, Spanish format (24-hour clock and day/month order) will be used for Spanish, and English format (possibly 12-hour clock with AM/PM, depending on region) for English. We should confirm how we want to display times – likely a 24-hour format might be acceptable for both, but we can refine for locale if desired.

Content from API: Note that bus stop names, line names, etc., will likely come from the API in Spanish (since they are proper nouns or local names). We will not attempt to translate those (they will appear as is). Our i18n mainly applies to the app UI (menus, labels, buttons, error messages). That is standard practice: data is not translated unless the API provides multi-language data. The CTAN API likely provides data in Spanish only, which is fine.

Testing i18n: We will test that all UI text swaps correctly when switching languages. Also, we’ll verify the default language logic by simulating different browser language settings. We should also ensure that adding a new language is straightforward by perhaps doing a small test addition (maybe add a fake language file during development to see if the pipeline picks it up).

No Mixed Languages: We’ll ensure that we do not mix languages in the UI. For example, we won’t show Spanish error text when the app is in English. This requires discipline that every string displayed is run through the translation system. Code reviewers (or our linter, if configured with ngx-translate lint rules) will help catch any hard-coded strings.

By implementing i18n from the start, we ensure the app is welcoming to users in both Spanish and English, and easily extensible for others. It is much easier to build this in now than to retrofit later, so we’ll do it upfront.

Progressive Web App (PWA) & Offline Support

We aim to deliver a robust PWA that works well even with limited connectivity. Key PWA aspects in this project:

Service Worker & Caching: Using Angular’s PWA package (ng add @angular/pwa), the project will include a service worker (ngsw-worker.js) configured by ngsw-config.json. This service worker will automatically cache the app’s static assets (HTML, JS, CSS, images) upon first visit, which allows the app to load reliably fast on subsequent visits and even function offline (for the parts of the app that don’t require new data). We will verify that the service worker is caching these files correctly by checking the Angular service worker manifest. By default, Angular will cache all the build files and re-fetch updates in the background, which aligns with best practices for PWA.

Data Caching Strategy: We will extend the service worker configuration to cache API responses as needed. Specifically, we can configure data groups in ngsw-config.json for our API endpoints. For example, we might set up a data caching rule for the stops list endpoint (since that data is mostly static or changes rarely). We can have it cached and update it occasionally (say, refresh once a day or on app reload) – this way, if the user is offline or the API is slow, we still have the stops. Another data group could cache the schedule queries (stop services) for a short time. For instance, if a user views a stop’s times, we cache that response for maybe 5-10 minutes so that if they navigate away and back or lose connection briefly, we can show cached times (with an indication that it’s cached). We will mark such caches with a reasonable freshness and max age. The goal is not to cache stale schedule data for too long, but just to bridge short offline periods or repeated views. All of this will be configured carefully in the service worker config.

Offline Behavior: When offline, the app will still start (thanks to cached assets). We will implement a check for network status and if offline, inform the user (e.g., show a toast “You are offline. Showing saved data.”). If the user tries to load new data that isn’t in cache, we handle that gracefully (perhaps show an error or a message that this feature is unavailable offline). Features like the map might be limited offline if tile data isn’t cached beyond what was seen. But core functionality like viewing a favorite stop’s schedule that was recently accessed might still work via cache. We will test the app offline to ensure it doesn’t crash and provides as much utility as possible.

Installable App: We will configure the Web App Manifest (which Angular PWA does for us). This includes setting the app name, short name, description, theme colors, and specifying icons in various sizes. We will prepare app icons (maybe using a generated icon set) so that when the user installs the PWA on their phone or desktop, it has a nice identifiable icon. The manifest also declares things like orientation (we can allow both portrait and landscape since on tablets or for map usage landscape might be fine). Once this is set, users will get an “Add to Home Screen” prompt. We should test installation on at least one platform (Android Chrome is typical) to ensure it installs and launches correctly.

HTTPS Requirement: Note that PWA features (service worker, geolocation) require the app to be served over HTTPS (or localhost during development). We will keep that in mind for deployment – the final hosting must support HTTPS. During development, Angular’s ng serve on localhost is fine. For geolocation (finding nearest stop), if we test on a dev build served over http:// (non-localhost), the browser will block it. So, we will plan to always use HTTPS in production.

Performance and UX: PWA also means focusing on performance. We’ll use lazy loading of routes (especially for heavy components like the map) to keep initial load fast. We’ll also use Angular’s build optimizer and maybe further performance tuning (like compressing images, using efficient change detection, etc.) so that the app feels snappy on mobile devices.

Background Sync / Updates: While not a requirement, we note that Angular service worker will automatically check for updates to the app. We will make sure to handle updates gracefully – possibly inform the user that a new version is available (Angular SW can be programmed to do so). If we have time, we might also consider using background sync for queued requests if any (though for this app, not much need unless we allow offline actions).

Testing PWA: We’ll use Chrome DevTools Lighthouse audit to ensure PWA compliance (it will check things like service worker, manifest, responsiveness). We’ll also test that if the API is unreachable, the app doesn’t hang – for example, if offline and user opens a stop that was never loaded before, the UI should show “No connection” rather than a spinner forever.

By implementing these PWA features, we ensure the app is resilient and user-friendly, even under less-than-ideal network conditions, which is often the reality for mobile users of transit apps.

External API (CTAN) Integration

The application will consume the CTAN Open Data API to retrieve all transit information. We will document and use the relevant endpoints provided by this API. Important details about the API and how we use it:

Base URL and Structure: The base endpoint for the API is https://api.ctan.es/v1/. All calls require specifying a Consorcio (area) code to indicate which metropolitan area’s data we want
api.ctan.es
. For example, Seville’s area code is 1
api.ctan.es
. Since our app is focused on the Sevilla area by default, we will use Consorcios/1 in the URL. (If needed in the future, we can make this dynamic or configurable to support other areas like Málaga (4), etc.) All API responses are in JSON format
api.ctan.es
, which is convenient for our Angular app.

Authentication: The CTAN API is open and does not require an API key or auth token for the endpoints we need (the documentation indicates “Permission: Todos”, meaning open to all users). This simplifies our integration; we just make GET requests to the endpoints.

Key Endpoints: We will utilize the following endpoints (all under the base /v1/Consorcios/1 for Sevilla):

GET /Consorcios/1/paradas – List All Stops in the area. This returns an array of stops with their details (each stop likely has an ID, name, geographic coordinates, and maybe additional info like what zone or lines it belongs to). We will use this to obtain the master list of stops for features like search and nearest stop. Because this can be a large list (potentially hundreds of stops for Seville; the whole network across Andalusia has ~4939 stops
api.ctan.es
), we will fetch it once and cache it in memory (and possibly localStorage). If performance becomes an issue, we might filter it by zones or use alternative endpoints (see next point).

GET /Consorcios/1/zonas/{idZona}/paradas – Stops by Zone. The API allows fetching stops within a specific zone. A “zone” likely corresponds to a municipality or area. If the all-stops list is too large or if we want to lazy-load by area, we could use this. For example, if we know the user’s city or we derive zone from coordinates, we could fetch only that zone’s stops. We’ll get zone info if needed by another endpoint (/zonas). However, initially we might not need to complicate with zones – a single fetch of all stops in Seville area might be fine.

GET /Consorcios/1/paradas/{idParada} – Stop Details. This might return information about a specific stop (like its name, location, etc.). We might not need to call this often if we already have the stops list (which includes names, etc.). But if needed, it’s available.

GET /Consorcios/1/paradas/{idParada}/servicios?fecha={YYYYMMDD} – Services (Buses) at a Stop. This is a crucial endpoint for our app. It returns all the scheduled services (bus trips) that pass through the given stop on the specified date. From this, we get the arrival times of various lines at that stop. The response likely includes each service’s line identifier, destination (end of line), and the time it reaches the stop (possibly in an array or sorted by time). We will call this endpoint when the user goes to a stop’s detail page. We’ll pass the date parameter (if none given, it might default to today’s date; we’ll specify it explicitly to be safe). We will parse the results to display upcoming times. If the API returns all times of day, we’ll filter in the frontend to highlight the next ones relative to current time. This endpoint will also be used (indirectly) for the route search feature: we can call it for the origin stop to know which lines are available at origin (though there is another way, see line endpoints).

GET /Consorcios/1/lineas – List All Lines. Returns all bus lines in the area, each with an ID and name (and possibly other metadata like the operator or route type). We will fetch this if we need to display a list of lines or to get line names by ID. However, for our features, knowing the line name/number for display might be necessary (e.g., show “Line M-123” instead of just an ID). The stop services endpoint might include line name, but if it only gives line ID, we’ll refer to this list to map IDs to names. We can cache the lines list similarly to stops.

GET /Consorcios/1/lineas/{idLinea} – Line Details. This provides details for a specific line, such as its full name, possibly the route description, operating hours, and any news or incidents. They mention that it shows if it has news and the mode of transport
api.ctan.es
. We might use this if we want to display line-specific info (like on a route result, maybe show the line’s full name or alert if there are disruptions). It’s not critical for basic operation, but nice to have.

GET /Consorcios/1/lineas/{idLinea}/paradas – Stops on a Line. This returns the ordered list of stops that a given line serves (likely for one direction or maybe both directions separately). This is extremely useful for determining if a line connects two stops. We will use this in the origin-destination search: for each candidate line, we fetch its stops (or we could fetch all lines’ stops upfront, but that’s a lot of data if done for every line). Instead, a strategy: when an origin and destination are selected, find lines serving origin and then for those lines, fetch their stops to check if they contain the destination. This endpoint allows that check. We’ll parse the returned stop list (which should be in route order) to determine the direction as well (which stop comes first).

Possibly other endpoints like GET /Consorcios/1/itinerarios/{idLinea} for a line’s route geometry, or GET /Consorcios/1/horarios for schedules between towns, etc., exist. For example, the CTAN site mentions getting schedules between two population centers (towns)
api.ctan.es
. That might be another way to do origin-destination if using town names, but since we focus on specific stops and direct routes, we might not use those high-level endpoints immediately. We should be aware they exist. If time permits, we could incorporate a more advanced journey planner using those. For now, we stick to the endpoints above.

Data Handling: We will create an Angular service (e.g., CtanApiService) to wrap all these API calls. This service will expose methods like getAllStops(), getStopServices(stopId, date), getAllLines(), getLineStops(lineId), etc. Internally it will use HttpClient to call the URLs and return Observables of the parsed JSON. We will add error handling (using catchError in RxJS operators) so that if a call fails, we return an empty result or a clear error message.

Performance Considerations: Some endpoints return large datasets (stops, lines). We will call those sparingly (maybe once at app startup or first use). We will also implement caching in the service:

For example, if getAllStops() is called and we already have the data from a previous call, just return it (no need to fetch again every time the home screen loads). We can store it in a service variable or use RxJS shareReplay for the Observable.

Similarly for getAllLines(). These are mostly static (they change only when transit schedules change, which is not daily for lines and stops). We might decide to refresh them if the app has been open for a very long time or on a new day, but otherwise once loaded, they persist.

For stop schedules (getStopServices), we won’t cache heavily because those depend on date and time. But we might cache the result for the current date for a short time, or at least until the user navigates away, in case they toggle filters or leave/return quickly.

Using the Data: After fetching, say, the stop services for a stop, we will interpret the data for display. For instance, if a service entry has a timestamp, we’ll convert it to a human-readable time (taking care of time zones – presumably times are local). If there’s a field indicating whether the bus is accessible (wheelchair), we will use that to decide whether to show the accessibility icon. We expect something like "accesible": true/false in the API for each service if available (this is based on typical GTFS data where a trip might have a wheelchair_accessible flag).

Error Scenarios: If an API call fails (network down, or API server error), our service will catch it. We will possibly log the error (console.error) for debugging, and for the UI we might throw a user-friendly message through the service (maybe as an Error object or a special return). The component can then show an alert or message like "Unable to load data. Please check your connection." (translated accordingly).

API Rate Limiting: The open data API likely has some rate limits (not documented in what we saw, but often open APIs ask not to spam). Our usage is fairly light (a handful of calls when user interacts). We will ensure not to, for example, fetch the entire stops list repeatedly. With caching and reasonable usage (fetch once and reuse data), we should be well within acceptable usage. If needed, we can implement small delays or avoid rapid repeated calls (e.g., if user is typing in a search box, debounce the calls or, better, filter locally after one fetch).

Documentation & Reference: For future maintainers, we will document in the code (or this file) how the API structure works. The CTAN API documentation (accessible via their site, which uses apidoc) should be referenced for any unclear fields. For instance, if we need to clarify what a “servicio” object contains, we might refer to CTAN’s docs. Since this AGENTS.md is for guiding development, we’ve listed the endpoints and usage. Further details (like exact JSON response structure for each endpoint) can be found by examining example responses or CTAN’s API docs. We can even write a small script to fetch and log a sample during development to see the structure.

Example Workflow: When a user views a stop: The app calls getStopServices(stopId, date) -> API returns JSON of services -> our service maps it to an array of e.g. { lineId, lineName, destination, time, accessible } -> component receives that and displays it sorted by time, highlighting the next one. When a user searches origin/destination: The app might call getLineStops(lineId) for candidate lines -> check if destId is in that list -> if yes, include that line in results -> maybe also call getStopServices(origin, date) to get the next times for that line at origin (or we could call a different endpoint if available to get direct trip info, but likely easier to just get origin times and filter those belonging to the chosen dest via line stops logic).

By using the above API endpoints and strategies, we ensure the app has up-to-date and accurate transit information. We will keep this integration modular, so if the API changes or if we want to switch data sources (like using a local JSON or GTFS dataset), we could adapt the DataService implementation and leave the rest of the app unaffected.

Development Plan (Step-by-Step)

To implement this project in a systematic, test-driven way, we will break the work into a series of smaller tasks. Each task will produce a piece of functionality along with its tests, and we will verify and iterate gradually. Below is the proposed roadmap:

Project Initialization:

Scaffold a new Angular application using Angular CLI. For example: ng new bus-schedule-pwa --routing=true --style=scss. Include routing and SCSS from the start.

Initialize a git repository and make the initial commit (with the base Angular structure).

Add PWA support: ng add @angular/pwa@latest --project bus-schedule-pwa. This will set up the service worker and manifest. Verify ngsw-config.json is present.

Add Angular Material: ng add @angular/material. Choose a theme (e.g., Indigo/Pink or a custom theme) and set up animations as prompted. This will make Material components available for use.

Install ngx-translate (if chosen) and set up the basic translation module. For ngx-translate, npm install @ngx-translate/core @ngx-translate/http-loader. Set up TranslateModule in app.module and configure it to load translation files from assets/i18n.

(Optional) Set up a base ESLint configuration if not already (Angular v12+ comes with ESLint if opted, otherwise convert TSLint to ESLint). Ensure the linter is working (ng lint).

Outcome: A running Angular app with material design and PWA enabled, and a placeholder for i18n. At this stage, just a default page (maybe the Angular welcome) is shown. Commit this baseline.

Project Structure & Core Setup:

Create the fundamental structure: Generate components for the main screens – Home (home.component), Stop Detail (stop-detail.component), Route Search (route-search.component), and Map (map.component). Also, generate any needed services: e.g., DataService for API calls, LocationService if separate for geolocation logic, FavoritesService for managing favorites. Use ng generate component and ng generate service commands.

Set up the routes in app-routing.module.ts for these components. For example: '/' or '/home' goes to HomeComponent, '/stop/:id' to StopDetailComponent, '/search' to RouteSearchComponent, and '/map' to MapComponent. Ensure the router outlet is in app.component.html and navigation links can be tested.

Implement a simple navigation UI (maybe a toolbar with the app name and a nav menu or buttons to go to Home, Search, Map). This can use Angular Material toolbar and menu for polish.

Internationalization: set up the translation JSON files with a few sample keys (for example, keys for the app title, and menu item names like "Home", "Favorites", etc. in both languages). Load the default language based on navigator. Test switching by manually calling translateService.use('en') or 'es'.

Write basic unit tests to ensure each component creates successfully (ng test will generate spec files by default). Write a test for the translation service to ensure it returns expected values when switching languages.

Outcome: The app has a skeleton: you can navigate between empty pages (Home, Search, Map, Stop Detail) via the router, the PWA and i18n infrastructure is in place, and tests confirm components load. Commit this checkpoint.

Home Screen Implementation:

Develop the HomeComponent template and logic. It should include sections for: Recent Stops, Nearest Stop, and Favorites. At first, implement with placeholder data. For instance, have the component try to load recent stops from a service (which might be empty initially) and display a message if none. Similarly, favorites from FavoritesService (empty initially) and nearest stop via LocationService.

Implement the FavoritesService with methods to get/add/remove favorites (stored in localStorage). Write unit tests for this service (e.g., adding a favorite, removing, persistence check). Initially, favorites can be just stored by stop IDs.

Implement Recent stops – perhaps the DataService or a separate HistoryService can maintain a list of recently viewed stops. Each time a user views a stop detail, we will add it to recent (so logic for this might be added when doing Stop Detail, but Home will call a service to retrieve them). For now, stub a HistoryService that returns an empty list or a static list for testing.

Implement the Nearest Stop feature: Use the Geolocation API via a LocationService. This service should have a method to get current position (wrapping navigator.geolocation.getCurrentPosition in a promise or observable). Also, it will have a method to find the nearest stop given a position. For now, you can implement a simple version that requires the stops list. Possibly, defer the actual nearest calculation until we have the stops data from the API. You can stub it to return null or a dummy stop if no data. The UI can have a button "Find Nearest Stop" which triggers geolocation. If permission is denied or position can’t be found, handle that by showing an error message (again, via translation).

Style the Home page with Material components: maybe use <mat-list> to list recent and favorite stops (each with an icon and name), and a <mat-card> or so for each section. Keep it simple but structured. Ensure it’s responsive (Material is mobile-friendly by default; we can also use FlexLayout or CSS flexbox for layout).

Tests: Write tests for HomeComponent logic. For example, simulate that FavoritesService returns some IDs and ensure the template lists them (you might need to stub the DataService to provide stop names for those IDs for display). Test that clicking a favorite stop link triggers navigation (you can use Angular’s RouterTestingModule for that). Also test LocationService: if we provide a fake position, does HomeComponent properly call the service and get a result.

Outcome: The Home screen is functional (though the data may still be static or stubbed at this point). The layout is in place and we have tests for the core logic. Commit changes.

Data Service – API Integration:

Implement the DataService to connect to the CTAN API. Start with methods: getStops(), getStopSchedule(stopId, date), getLines(), getLineStops(lineId). Use HttpClient to call the endpoints documented above. For now, point to the base URL with Consorcio 1 (Sevilla). Make sure to include HttpClientModule in app.module.

For each method, decide return type. Likely, getStops() returns an Observable<Stop[]>. We define interface Stop { id: number; name: string; latitude: number; longitude: number; [other fields] }. Map the API JSON to this interface. Same for Line (id, name, etc.), and for Schedule entries (could define an interface for a bus service passing a stop, e.g., StopServiceEntry { lineId, lineName, destination, time, accessible } ). Possibly the API gives lineId and we need to map to name – the DataService can merge data if it has cached lines. Alternatively, just return lineId and let component or a pipe format it by looking up name via another service. But an integrated approach is fine too.

Implement caching: Inside DataService, use class properties to store the results of getStops and getLines after first call. Subsequent calls return the cached data (or perhaps return an Observable that is already completed with cached data). Use RxJS operators like shareReplay(1) to cache the observable result for all subscribers.

Error handling: Add .pipe(catchError(...)) to return an empty array or appropriate fallback on failure, and maybe log the error. This prevents the app from breaking if the API is down; the UI can then show no data message.

Unit test DataService: Use Angular’s HttpClientTestingModule to mock HTTP calls. Write tests to ensure that when getStops() is called, it hits the correct URL and parses the data properly. Test caching by calling twice and using HttpTestingController to ensure the second call did not produce a new request. Similarly, test getStopSchedule with a dummy stop ID and date – ensure the URL is correct (including date format) and the response is parsed to our interface. Also test error handling by simulating a 500 response and confirming the service returns an empty result (and maybe logs error).

Outcome: DataService is now capable of retrieving real data from the API. At this stage, you can manually test by calling DataService from, say, HomeComponent (in ngOnInit) to fetch stops and log the result, to see if it works with live data. Make sure to remove or adapt such test code later. Commit the DataService implementation.

Integrating Data with Home & Nearest Stop:

Now that DataService can fetch stops, integrate that into HomeComponent. On Home init, call DataService.getStops() to load the stops (if not already loaded). Once loaded, store them (or at least pass to LocationService or so). This might be done centrally (maybe in AppComponent we trigger one load of all stops when app starts, to have data ready; or we do lazy on Home and reuse globally). Either approach, ensure that once loaded, the data is cached in DataService.

Implement the nearest stop calculation properly: LocationService (or some helper function) can take the user’s coordinates and iterate through the stops list to find the one with minimum distance. Use the haversine formula or similar for distance between lat-long. Since this is somewhat computational, ensure it’s reasonably optimized (5k points is fine to brute force). Possibly, if performance is an issue, consider spatial partitioning or using the Geolocation API’s ability to query nearby (but it doesn’t provide that, so brute force is fine). Return the nearest stop or top 3 nearest maybe. For now, nearest single is fine.

Update HomeComponent to display the nearest stop’s name (and maybe distance) after the user clicks the “find nearest” button. Use Material dialog or snackbar to ask for geolocation permission if needed (or just rely on browser prompt). Ensure to handle if permission denied: display a message.

Favorites and Recent: Now integrate actual data for these. If FavoritesService stores just IDs, HomeComponent can map those IDs to full stop objects by looking them up in DataService’s cached stops list. That way, we can display the stop name in the favorites list. Implement that mapping (perhaps DataService could offer a method getStopById(id) that looks into the cached list).

For Recent stops (HistoryService), implement it similarly (store list of IDs in localStorage or a service property). Whenever a stop detail is visited, add to history (we’ll implement that in Stop Detail step). Home will retrieve the list of recent IDs and map to names for display.

UI: Make each favorite or recent stop clickable (as a link or button) to navigate to the Stop Detail page for that stop. Use Angular Router [RouterLink] with the stop id parameter. Also, if nearest stop is found, you can show a button “View Schedule” to go to that stop’s detail.

Test: Update HomeComponent tests to account for real DataService integration. You may use a stub DataService in the test that returns a mock stop list (to simulate caching). Test that after calling findNearest (with a known location), the component correctly identifies the expected stop. Test that clicking on a stop triggers navigation (maybe spy on Router.navigate). Also test that favorite list shows correct names by stubbing DataService.getStopById.

Outcome: Home screen now actually uses live data: It loads stops from API (one-time), shows favorite and recent stops by name (though recent might still be empty initially), and can calculate nearest stop. The app is starting to be functional. Commit these changes.

Stop Detail Screen Implementation:

Work on StopDetailComponent. This component is routed with a stop ID parameter. It should on init fetch that stop’s schedule data via DataService.getStopSchedule(stopId, date). The default date is today – use new Date() to format as required (likely YYYY-MM-DD or the format API expects, maybe the API might just take current date if omitted but better to specify).

The component will maintain state like: list of services (buses) for that stop, currently selected date, filter for time or destination. Initially, implement without filters (show all upcoming times of the day from now). Once basic listing works, add filter controls.

Use Angular Material components: perhaps a <mat-tab-group> to toggle between “All” and “By Destination” or maybe simpler: a dropdown (mat-select) to choose a destination filter (populate it with unique destinations from the schedule list, plus an "All destinations" option). For time filter, maybe just a slider or input to choose a starting hour, or simpler, a button “Show all times / Show future times only”. Alternatively, since we highlight past vs future, maybe we don’t need a strict filter for time, just visually separate past times (or list them if needed). To keep it simple, perhaps do this: show all times of the day but in two sections – already passed (maybe gray out) and upcoming (normal highlight next one). The user can scroll or see both. However, the requirement said filter by time and destination, so perhaps we provide UI controls:

Destination filter: a dropdown of destinations (the API likely provides destination name or final stop for each trip).

Time filter: could be an input (e.g., “Show times after: [time picker]”) defaulting to now. Or a range slider (0-24h) to filter out earlier times.

Date picker: to select a different date’s schedule (Material has a nice date picker). The DataService will need to fetch that date’s data when changed.

Implement the filters in component logic: The raw data from API (for a given date) can be stored. On filter change, compute a filtered list. For example, if a destination filter is applied, only include services matching that destination or line. If a time filter (like after X) is applied, drop those earlier than X. The filtering can be done via array filter functions (pure logic, which can be unit tested separately). Possibly implement these as pure utility functions for testability (e.g., a function filterServices(services, destination?, afterTime?)).

Accessibility icon: If a service entry has an accessible flag, display an icon (like a wheelchair symbol, Material has an icon or we use an emoji ♿). Add an aria-label for it ("Accessible bus").

Add a button to add/remove this stop from Favorites. For example, a star icon button that is filled if already favorite, hollow if not. Clicking toggles favorite via FavoritesService and updates icon. This makes it easy for user to favorite from the detail page.

Also, when component loads, add this stop to Recent history. Use HistoryService: e.g., HistoryService.addRecent(stopId) which adds to localStorage (maybe keeping only last N entries to limit size, say 10). This ensures next time Home will show it under recent.

Ensure to fetch the stop name (for display as title on the page). If we have the stops list cached, we can get the name by ID from DataService or from route data (perhaps pass the name as well through route if available, but easier to just look up).

Test: Write tests for StopDetailComponent. Use HttpTestingController or better, provide a stub DataService that returns a predetermined schedule array (with different destinations, times). Test that the component filters correctly: set a destination filter and ensure only matching entries are shown. Test that the favorite button calls FavoritesService (spy on add/remove). Test that changing the date (simulate picking tomorrow) triggers a new API call (you might simulate DataService.getStopSchedule being called with new date). Also test that the next bus is correctly identified/highlighted (you might add a CSS class or some marker for the next bus in template and check it in tests).

Outcome: The Stop Detail page is feature-complete: it loads data for a stop, shows the schedule with filters and highlights, and allows the user to favorite the stop. It updates recent stops. We now have a working core feature of the app. Commit this implementation.

Route Search (Origin/Destination) Implementation:

Develop the RouteSearchComponent. This will contain a form with three main inputs: Origin stop, Destination stop, and Date (plus maybe time if needed, but the requirement only specifically said date). Use Angular’s Reactive Forms or Template Forms – Reactive might be cleaner here. Use Angular Material’s autocomplete for the stops fields: a <input matInput [matAutocomplete]="auto"> for origin and one for destination. The options for the autocomplete will be the list of stops (so we need the stops list available). We should reuse DataService.getStops (already cached) to feed the options. To avoid displaying thousands of options at once, use the autocomplete filtering: as user types, filter the stop list by name. Angular Material provides this functionality (we can bind a filter function or use FormControl valueChanges to filter).

When an origin is selected, we need to filter the destination options to only those reachable by a direct route. How to do this: We can pre-compute or dynamically compute reachable stops. Approach:

Eager approach: Precompute a map of stop -> set of stops reachable via one trip (basically union of all stops on lines that service the origin). But that could be heavy to precompute for every stop globally.

On-the-fly approach: When origin is chosen, call DataService.getStopSchedule(origin, date) to get all services from that origin on that date (which gives all lines leaving origin that day). Extract unique line IDs from that schedule. For each such line, call DataService.getLineStops(lineId) to get its stops. Aggregate all stops from those lines. That set (minus the origin) is the set of reachable stops. Intersect that with the destination typed by user? Actually, easier: we can limit the destination dropdown to this set directly. So once origin is set, we replace the destination autocomplete’s list with only reachable stops (by name).

We should be careful with performance: if origin is a major hub with many lines, we may call getLineStops for a dozen lines. That’s fine. We can also optimize: DataService could fetch line stops for those lines in parallel and cache them so next time if the user picks the same origin again, no duplicate calls.

Alternatively, there might be an API to get direct routes between two stops, but not sure if provided. We’ll do the above logic as it’s straightforward and within our control.

Implement form submission: When the user has selected origin, destination, and date, and hits “Search” (a button), we will present the results. The result could be shown on the same component below the form, or navigate to a results page. For simplicity, show on same page a list of possible routes.

For each line that connects origin->destination: show the line name/number, and the next departure time from the origin (or list of times). We can obtain the next departure by taking the origin’s schedule and filtering to that line and after current time.

If there are multiple lines (multiple direct routes), list them all. If none, display “No direct route found” message.

Optionally, allow the user to click a route result to see more details (maybe navigate to Stop Detail of origin with that line filtered – but our Stop Detail doesn’t filter by line easily, so maybe not).

At least, show the travel line and maybe the travel time or how many stops between origin and dest. We can get number of stops between them by looking at the index difference in the line’s stop list.

Also, display the destination’s name and maybe expected arrival time if we combine schedule info (that would require knowing travel time between origin and dest stops; if schedules have times at each stop, but they likely only give time at that specific stop per call).

Given the complexity, we might simplify: show the lines and next departure from origin. That’s enough for user to know which bus to catch. They can then use the stop detail to see full schedule of that line if needed.

Build UI: The form inputs and a search button at top. Results in a <mat-list> or <div> below. Use <mat-card> for each result route possibly, showing “Line X from [origin name] to [destination name]: next bus at 14:35 (accessible)” etc.

Validate user input: ensure both origin and destination are selected (and not the same stop) before allowing search. Possibly disable the search button until valid.

Tests: Simulate choosing an origin (set form control value to a certain stop), then simulate DataService returning certain lines. You might stub DataService.getStopSchedule to return services for lines A, B. Then stub getLineStops for those lines returning stops including the destination. Then trigger search and verify that the result list shows the expected line. Test the filtering: if origin is set, ensure destination options are filtered appropriately (this can be tricky in unit test without UI, but you could call the function that filters). Also test form validation (e.g., same origin/dest or empty dest yields no result).

Outcome: The route search feature is working for direct routes. This addresses the user story of selecting origin/destination stops and date and seeing possible ways to travel. Commit the implemented feature.

Map Screen Implementation:

Use Leaflet for the MapComponent. Include the Leaflet CSS and JS. Install an Angular wrapper if it simplifies (ngx-leaflet) or just use the global L object. If using ngx-leaflet, set up the module.

In MapComponent, initialize a map centered perhaps on Seville area by default. Set an appropriate zoom.

Add a tile layer for map (OpenStreetMap tiles via URL).

Add markers for bus stops. But we won’t add all at once (which could be ~500 stops for area). Instead, implement progressive loading:

Option 1: Use Leaflet’s moveend event. When the map moves or zooms, get the current bounding box (latLngBounds). Then filter our cached stops list to those whose coordinates fall within that bounds (and maybe a bit beyond to pre-load). Then show markers for those. This requires that we have the full stops list in memory (we do from DataService.getStops).

Option 2: If we didn’t want to load all stops upfront (but we did already likely), we could have called an API by bounding box if available, but since we have the data, filtering client-side is fine.

Use Leaflet marker clustering if the points are dense, to improve performance. Alternatively, limit adding markers if too many (but 500 is fine for Leaflet).

Implement it: subscribe to map events, filter stops, and add markers. For performance, we might want to not re-add markers that are already on map. Perhaps keep track of which markers are currently displayed. Or simpler, clear and redraw on each moveend (with 500 points, it's okay).

Clicking a marker: show a popup with the stop name and a “View Schedule” link. Leaflet markers can bind popups. That link when clicked should navigate to Stop Detail (we can integrate Angular routing by having the link as an actual anchor with routerLink, or by capturing click and using Router navigate).

Perhaps add a control to toggle between clustering and raw markers (not necessary, maybe always cluster if too cluttered).

Ensure the map view updates if user selects “Map” from menu after having some data. Possibly, ensure the map invalidates size (Leaflet quirk) if container was hidden. You might call map.invalidateSize() on init to properly display.

Tests: MapComponent is hard to unit test because it involves external leaflet. We can skip heavy testing here beyond maybe verifying that after ngOnInit, the map variable is defined and some markers count matches expected in initial view. Could mock Leaflet if needed. For E2E, we would test panning the map and seeing markers show up, but unit test can be light.

Outcome: The Map screen displays bus stops on a map and allows the user to discover stops visually. It loads data progressively using the already cached stops list. Commit the addition.

Final Touches and Quality Assurance:

Go through the app and polish any UI issues: e.g., ensure text is properly translated (complete the translation JSON files for all UI strings we added during development), make sure responsive design looks good (test on mobile dimensions and desktop). Adjust CSS as needed (maybe add some margins, use Material grid or flex layout for alignment).

Check that all icons (like the accessibility icon, favorite star, etc.) have appropriate ARIA labels or tooltips for accessibility. Possibly use <mat-tooltip> for buttons to explain their function (in both languages).

Review the code for any places not following our best practices (e.g., any leftover console logs, any magic strings that crept in, overly complex functions that could be simplified). Refactor where necessary. Ensure no commented-out code is left.

Ensure tests cover all major logic. Add tests for any gap. Aim for a high coverage (e.g., >90% on services and >80% overall).

Test the PWA behavior: run ng build --prod and serve it, simulate offline to see that the home page loads. Test on a mobile device if possible for geolocation and general feel.

Prepare documentation (like this file) if needed to include usage instructions (though this Agents.md already covers dev details).

Outcome: A final commit with all fixes, ready for release or further development.

Future Improvements (beyond MVP): (This is not a required step, but a note for possibilities)

Add real-time updates if available (maybe CTAN provides a real-time feed for bus arrivals – GTFS-RT). That could be integrated to update times dynamically.

Use the GTFS data for offline mode entirely (since they provide a GTFS zip
api.ctan.es
, we could parse it and have offline schedules for all lines, though that’s complex for a web app).

Enhance journey planner to allow transfers (multi-leg routes) using algorithms like Dijkstra on the stops graph.

Integrate a fare calculator if the API tarifas is useful.

Incorporate user accounts to sync favorites across devices (would require a backend).
These are beyond the current scope but the architecture we set (particularly the clean separation of data logic) would accommodate many of these additions with minimal impact on existing code.