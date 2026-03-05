const HEX_LENGTH = 7;
const RGB_COMPONENTS = 3;
const RGBA_COMPONENTS = 4;
const CONTRAST_THRESHOLD = 4.5;

const toRelativeLuminance = (color: string): number => {
  const normalized = color.trim().toLowerCase();

  if (normalized.startsWith('#') && normalized.length === HEX_LENGTH) {
    const red = parseInt(normalized.slice(1, 3), 16) / 255;
    const green = parseInt(normalized.slice(3, 5), 16) / 255;
    const blue = parseInt(normalized.slice(5, 7), 16) / 255;
    return getChannelRelativeLuminance(red, green, blue);
  }

  if (normalized.startsWith('rgb(')) {
    const values = normalized
      .replace('rgb(', '')
      .replace(')', '')
      .split(',')
      .map((value) => Number.parseFloat(value.trim()));

    if (values.length === RGB_COMPONENTS) {
      const [red, green, blue] = values.map((component) => component / 255) as [number, number, number];
      return getChannelRelativeLuminance(red, green, blue);
    }
  }

  if (normalized.startsWith('rgba(')) {
    const values = normalized
      .replace('rgba(', '')
      .replace(')', '')
      .split(',')
      .map((value) => Number.parseFloat(value.trim()));

    if (values.length === RGBA_COMPONENTS) {
      const [red, green, blue, alpha] = values as [number, number, number, number];
      const normalizedAlpha = clamp(alpha, 0, 1);
      const adjusted = [red, green, blue].map((component) => (component / 255) * normalizedAlpha) as [
        number,
        number,
        number,
      ];
      return getChannelRelativeLuminance(adjusted[0], adjusted[1], adjusted[2]);
    }
  }

  throw new Error(`Unsupported color value: ${color}`);
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const channelTransform = (component: number): number =>
  component <= 0.03928 ? component / 12.92 : Math.pow((component + 0.055) / 1.055, 2.4);

const getChannelRelativeLuminance = (red: number, green: number, blue: number): number =>
  0.2126 * channelTransform(red) + 0.7152 * channelTransform(green) + 0.0722 * channelTransform(blue);

const getContrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = toRelativeLuminance(foreground);
  const backgroundLuminance = toRelativeLuminance(background);
  const [lighter, darker] = [foregroundLuminance, backgroundLuminance].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('theme color tokens', () => {
  it('exposes tertiary text color meeting the minimum contrast requirement', () => {
    const styles = getComputedStyle(document.documentElement);
    const tertiary = styles.getPropertyValue('--color-text-tertiary').trim();
    const background = styles.getPropertyValue('--color-background').trim();

    expect(tertiary).not.toBe('');
    expect(background).not.toBe('');

    const ratio = getContrastRatio(tertiary, background);

    expect(ratio).toBeGreaterThanOrEqual(CONTRAST_THRESHOLD);
  });
});
