import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const HOME_PATH = '/';
const ROUTE_SEARCH_PATH = '/routes';
const MAP_PATH = '/map';
const LINES_PATH = '/lines';
const NEWS_PATH = '/news';
const NORMAL_TEXT_CONTRAST_THRESHOLD = 4.5;
const LARGE_TEXT_CONTRAST_THRESHOLD = 3;
const LARGE_TEXT_SIZE_PX = 24;
const LARGE_BOLD_TEXT_SIZE_PX = 18.66;
const LARGE_TEXT_WEIGHT = 700;

interface RenderedContrastSample {
  readonly foreground: string;
  readonly background: string;
  readonly fontSizePx: number;
  readonly fontWeight: number;
}

interface RenderedTextStyle {
  readonly foreground: string;
  readonly fontSizePx: number;
  readonly fontWeight: number;
}

const parseChannel = (component: number): number =>
  component <= 0.03928 ? component / 12.92 : Math.pow((component + 0.055) / 1.055, 2.4);

const parseColor = (value: string): [number, number, number] => {
  const components = value.match(/[\d.]+/g)?.map(Number) ?? [];
  if (components.length < 3) {
    throw new Error(`Unsupported color value: ${value}`);
  }

  return [components[0] / 255, components[1] / 255, components[2] / 255];
};

const getLuminance = (value: string): number => {
  const [red, green, blue] = parseColor(value);
  return 0.2126 * parseChannel(red) + 0.7152 * parseChannel(green) + 0.0722 * parseChannel(blue);
};

const getContrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const resolveContrastThreshold = (sample: RenderedTextStyle): number => {
  const isLarge =
    sample.fontSizePx >= LARGE_TEXT_SIZE_PX ||
    (sample.fontSizePx >= LARGE_BOLD_TEXT_SIZE_PX && sample.fontWeight >= LARGE_TEXT_WEIGHT);
  return isLarge ? LARGE_TEXT_CONTRAST_THRESHOLD : NORMAL_TEXT_CONTRAST_THRESHOLD;
};

async function readRenderedContrast(target: Locator): Promise<RenderedContrastSample> {
  return target.evaluate((element: HTMLElement) => {
    type Rgba = readonly [number, number, number, number];

    const parseComputedColor = (value: string): Rgba => {
      const components = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (components.length < 3) {
        throw new Error(`Unsupported computed color: ${value}`);
      }

      return [components[0], components[1], components[2], components[3] ?? 1] as const;
    };

    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      if (alpha === 0) {
        return [0, 0, 0, 0] as const;
      }

      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) /
          alpha,
        alpha,
      ] as const;
    };

    const backgrounds: Rgba[] = [];
    let current: HTMLElement | null = element;
    while (current) {
      backgrounds.push(parseComputedColor(getComputedStyle(current).backgroundColor));
      current = current.parentElement;
    }

    let resolvedBackground: Rgba = [255, 255, 255, 1];
    for (const background of backgrounds.reverse()) {
      resolvedBackground = composite(background, resolvedBackground);
    }

    const styles = getComputedStyle(element);
    const foreground = composite(parseComputedColor(styles.color), resolvedBackground);
    const numericWeight = Number.parseInt(styles.fontWeight, 10);
    const fontWeight = Number.isFinite(numericWeight) ? numericWeight : 400;

    const toCssRgb = (color: Rgba): string =>
      `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;

    return {
      foreground: toCssRgb(foreground),
      background: toCssRgb(resolvedBackground),
      fontSizePx: Number.parseFloat(styles.fontSize),
      fontWeight,
    } satisfies RenderedContrastSample;
  });
}

async function readRenderedTextStyle(target: Locator): Promise<RenderedTextStyle> {
  return target.evaluate((element: HTMLElement) => {
    const styles = getComputedStyle(element);
    const numericWeight = Number.parseInt(styles.fontWeight, 10);
    return {
      foreground: styles.color,
      fontSizePx: Number.parseFloat(styles.fontSize),
      fontWeight: Number.isFinite(numericWeight) ? numericWeight : 400,
    } satisfies RenderedTextStyle;
  });
}

async function readGradientStopColors(surface: Locator): Promise<readonly string[]> {
  const backgroundImage = await surface.evaluate(
    (element: HTMLElement) => getComputedStyle(element).backgroundImage,
  );
  const colors = backgroundImage.match(/rgba?\([^)]*\)/g) ?? [];

  if (colors.length < 2) {
    throw new Error(
      `Expected a gradient with at least two color stops, received: ${backgroundImage}`,
    );
  }

  return colors;
}

async function expectRenderedContrast(target: Locator, label: string): Promise<void> {
  await expect(target, `${label} must be rendered`).toBeVisible();
  const sample = await readRenderedContrast(target);
  const ratio = getContrastRatio(sample.foreground, sample.background);
  const threshold = resolveContrastThreshold(sample);

  expect(
    ratio,
    `${label} contrast ${ratio.toFixed(2)}:1 must meet ${threshold}:1 (${sample.foreground} on ${sample.background})`,
  ).toBeGreaterThanOrEqual(threshold);
}

async function expectRenderedGradientContrast(
  target: Locator,
  surface: Locator,
  label: string,
): Promise<void> {
  await expect(target, `${label} must be rendered`).toBeVisible();
  const sample = await readRenderedTextStyle(target);
  const backgroundStops = await readGradientStopColors(surface);
  const threshold = resolveContrastThreshold(sample);

  for (const background of backgroundStops) {
    const ratio = getContrastRatio(sample.foreground, background);
    expect(
      ratio,
      `${label} contrast ${ratio.toFixed(2)}:1 must meet ${threshold}:1 (${sample.foreground} on ${background})`,
    ).toBeGreaterThanOrEqual(threshold);
  }
}

async function open(page: Page, path: string): Promise<void> {
  const baseUrl = BASE_URL as string;
  await page.goto(new URL(path, baseUrl).toString());
}

test.describe('rendered theme contrast', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for contrast checks.');

  test('keeps representative card, hero and map-panel copy WCAG AA compliant', async ({ page }) => {
    await open(page, HOME_PATH);
    await expectRenderedContrast(page.locator('.home__card-title'), 'home card title');
    await expectRenderedContrast(page.locator('.home__card-subtitle'), 'home muted subtitle');

    await open(page, ROUTE_SEARCH_PATH);
    await expectRenderedGradientContrast(
      page.locator('.route-search__description'),
      page.locator('.route-search'),
      'route-search hero description',
    );

    await open(page, MAP_PATH);
    const linesInspector = page.locator('.map__inspector--lines');
    await linesInspector.locator(':scope > summary').click();
    await expectRenderedContrast(linesInspector.locator('.map__panel-title'), 'map lines heading');
  });

  test('keeps Lines pagination labels readable on the hero gradient', async ({ page }) => {
    await open(page, LINES_PATH);

    const pagination = page.locator('.lines__pagination');
    await expect(pagination).toBeVisible({ timeout: 15_000 });
    const actions = pagination.locator('.app-outline-button');
    await expect(actions).toHaveCount(2);

    const previous = actions.first();
    const next = actions.last();
    await expect(previous).toContainText('Anterior');
    await expect(next).toContainText('Siguiente');
    await expect(previous.locator('.material-symbols-outlined')).toBeVisible();
    await expect(next.locator('.material-symbols-outlined')).toBeVisible();
    await expectRenderedGradientContrast(
      next,
      page.locator('.lines'),
      'lines next pagination action',
    );

    const [previousStyle, nextStyle] = await Promise.all([
      readRenderedTextStyle(previous),
      readRenderedTextStyle(next),
    ]);
    expect(previousStyle.foreground).toBe(nextStyle.foreground);
  });

  test('keeps populated news card metadata and summary WCAG AA compliant', async ({ page }) => {
    await open(page, NEWS_PATH);

    const firstCard = page.locator('.news__card').first();
    await expect(firstCard).toBeVisible();
    await expectRenderedContrast(firstCard.locator('.news__card-title'), 'news card title');
    await expectRenderedContrast(firstCard.locator('.news__card-date'), 'news card date');
    await expectRenderedContrast(firstCard.locator('.news__card-summary'), 'news card summary');
  });
});
