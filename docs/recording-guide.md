# Recording guide

The recording utility extends the Playwright-based screenshot runner with video capture while preserving every DOM automation capability. It shares the same configuration parsing, waits, selectors, localization support, and offline tooling as the historical `scripts/screenshot.js` entry point, and enables optional video capture in the same session using Playwright contexts configured with `recordVideo`.

## Supported flags

| Flag | Default | Description |
| --- | --- | --- |
| `--url` | _(required)_ | Target URL to load before performing actions. |
| `--outDir` | `artifacts/screenshots` | Directory for legacy screenshot naming. |
| `--name` | `capture` | Base name for generated screenshot files. |
| `--fullPage` | `false` | Capture the full scrollable page instead of the viewport. |
| `--headless` | `true` | Launch the Playwright browser in headless mode; set to `false` for interactive debugging. |
| `--locale` | `es`/`en` | Locale list; multiple locales trigger multiple captures. |
| `--waitFor` | _(none)_ | CSS selector that must be visible before continuing. |
| `--click` / `--hover` / `--focus` | _(none)_ | DOM actions executed before the capture. |
| `--type` / `--press` / `--select` | _(none)_ | Typed selectors with values for user input simulation. |
| `--scrollTo` | _(none)_ | Scroll to selectors, coordinates, or page bounds. |
| `--steps` / `--scenario` | _(none)_ | JSON inline steps or scenario file describing custom flows. |
| `--fileName` | `recording.mp4` | Output file name for the recorded video; extension determines the container (`.mp4` or `.webm`). |
| `--duration` | `0` | Central segment duration in seconds; must be greater than zero when recording. |
| `--marginStart` | `0` | Seconds to wait before starting the scripted actions while video recording. |
| `--marginEnd` | `0` | Seconds to wait after scripted actions before stopping the recording. |
| `--outputDir` | `examples/media` | Directory for recorded media and screenshot overrides. |
| `--screenshotName` | _(generated)_ | Override for the screenshot file name; extension controls format (`.png`, `.jpg`, `.jpeg`). |

All other flags accepted by the original screenshot utility (timeouts, retries, storage state, HAR capture, map helpers, etc.) remain available and behave identically. File formats are inferred from the provided extensions and normalized to lowercase.

## Examples

```bash
# Legacy screenshot-only behavior (via shim)
pnpm run screenshot -- --url=http://localhost:4200/favs --fullPage=true --name=localhost --locale=en

# Video + screenshot with margins
pnpm run record -- \
  --url=http://localhost:4200/favs \
  --duration=10 --marginStart=1 --marginEnd=1 \
  --fileName=example.mp4 --screenshotName=example.png \
  --click=".shell-actions__button" --locale=en
```

## Sharing demo captures

- Generate showcases against stable public pages such as Wikipedia so reviewers can reproduce the run.
- Upload the resulting screenshot and video to an external host, add the links to the pull request summary or comments, and delete the local binaries afterward.
- Keep the repository free of committed media assets to avoid bloating the history.

## Troubleshooting

- **Permission prompts or blocked windows**: run `pnpm run record -- --headless=false` when debugging locally and review the Playwright console transcript (`--consoleLog`) to verify granted permissions and modal handling.
- **Codec availability**: Playwright produces `.mp4` files via its bundled ffmpeg binaries. If a platform lacks ffmpeg support, fall back to `.webm` by setting `--fileName` with that extension.
- **Long-running captures**: increase `--duration` and margins to cover asynchronous data loading, and consider enabling `--waitFor`, `--waitHidden`, or custom scenarios to synchronize network-driven updates.
- **Temporary video directory cleanup**: the recorder writes intermediate videos to a Playwright-managed temp directory that is removed after saving the final artifact. If a run exits unexpectedly, delete leftover `record-video-*` folders from your system temp path.
- **Repository media policy**: use publicly accessible reference pages (for example, Wikipedia) when demonstrating the workflow and avoid committing binary artifacts to the repository.
