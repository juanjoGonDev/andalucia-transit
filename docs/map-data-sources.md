# Map Data Sources and Permissions

## Leaflet and OpenStreetMap Attribution
Leaflet (BSD 2-Clause) powers the interactive map surface and requests the OpenStreetMap standard tile layer at `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. The project keeps the attribution string `© OpenStreetMap contributors` visible inside the map container, satisfying the Open Data Commons Open Database License (ODbL) requirements. Tiles are fetched on demand without custom caching or redistribution, so downstream consumers always receive the authoritative imagery from OpenStreetMap. When embedding screenshots in documentation we preserve the attribution text and cite OpenStreetMap as the source.

## Geolocation Consent Handling
The map never activates the W3C Geolocation API until a traveler presses the Locate button, ensuring explicit opt-in. The interface presents a bilingual explanation describing why location access is requested and surfaces translated error states for permission denial, timeouts, or unavailable positions. When permission is denied, no coordinate data is stored; the map resets nearby stop markers and shows guidance for manual exploration. These rules keep the feature aligned with GDPR expectations for lawful, informed consent and data minimization.
