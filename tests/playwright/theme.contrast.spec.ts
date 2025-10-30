import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const HOME_PATH = '/';
const CONTRAST_THRESHOLD = 4.5;

const parseChannel = (component: number): number =>
  component <= 0.03928 ? component / 12.92 : Math.pow((component + 0.055) / 1.055, 2.4);

const parseColor = (value: string): [number, number, number] => {
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
    const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
    const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
    return [red, green, blue];
  }

  if (normalized.startsWith('rgb(')) {
    const components = normalized
      .replace('rgb(', '')
      .replace(')', '')
      .split(',')
      .map((component) => Number.parseFloat(component.trim()) / 255);

    if (components.length === 3) {
      return [components[0], components[1], components[2]];
    }
  }

  if (normalized.startsWith('rgba(')) {
    const components = normalized
      .replace('rgba(', '')
      .replace(')', '')
      .split(',')
      .map((component) => Number.parseFloat(component.trim()));

    if (components.length === 4) {
      const alpha = Math.min(Math.max(components[3], 0), 1);
      return [
        (components[0] / 255) * alpha,
        (components[1] / 255) * alpha,
        (components[2] / 255) * alpha,
      ];
    }
  }

  throw new Error(`Unsupported color value: ${value}`);
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

test.describe('theme contrast tokens', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for contrast checks.');

  test('tertiary text token keeps contrast parity across the app background', async ({ page }) => {
    const baseUrl = BASE_URL as string;
    const targetUrl = new URL(HOME_PATH, baseUrl).toString();

    await page.goto(targetUrl);

    const colors = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        tertiary: styles.getPropertyValue('--color-text-tertiary').trim(),
        background: styles.getPropertyValue('--color-background').trim(),
      };
    });

    const ratio = getContrastRatio(colors.tertiary, colors.background);

    expect(ratio).toBeGreaterThanOrEqual(CONTRAST_THRESHOLD);
  });
});
