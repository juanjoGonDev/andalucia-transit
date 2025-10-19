# Map Data Sources and Permissions

## Leaflet and OpenStreetMap Attribution
Leaflet (BSD 2-Clause) powers the interactive map surface and requests the OpenStreetMap standard tile layer at `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. The project keeps the attribution string `© OpenStreetMap contributors` visible inside the map container, satisfying the Open Data Commons Open Database License (ODbL) requirements. Tiles are fetched on demand without custom caching or redistribution, so downstream consumers always receive the authoritative imagery from OpenStreetMap. When embedding screenshots in documentation we preserve the attribution text and cite OpenStreetMap as the source.

## Geolocation Consent Handling
The map never activates the W3C Geolocation API until a traveler presses the Locate button, ensuring explicit opt-in. The interface presents a bilingual explanation describing why location access is requested and surfaces translated error states for permission denial, timeouts, or unavailable positions. When permission is denied, no coordinate data is stored; the map resets nearby stop markers and shows guidance for manual exploration. These rules keep the feature aligned with GDPR expectations for lawful, informed consent and data minimization.

## Route Overlay Geometry and Caching
Route overlays reuse the CTAN line stops endpoint (`/Consorcios/{consortiumId}/lineas/{lineId}/paradas`) to resolve ordered stop coordinates for each matching line returned by the route search experience. The overlay builder filters the stop list by direction, locates the earliest matching origin stop order and the first matching destination order, and slices the ordered coordinates into a polyline segment. When the destination does not appear after the origin the remaining stop sequence is still rendered so travelers can visualize most of the journey.

Polyline coordinate arrays are cached per route selection using a composite key of the origin consortium, origin and destination stop id sets, active line signatures (line id + direction + stop ids), and the selected query date. Manual refresh clears the cached entry for the active selection before requesting fresh geometry so overlays stay aligned with evolving timetable results without re-requesting geometry for unchanged searches.
