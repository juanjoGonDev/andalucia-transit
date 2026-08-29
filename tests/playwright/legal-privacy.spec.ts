import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const STORAGE_NOTICE_KEY = 'andalucia-transit.privacyNotice.v1';
const LANGUAGE_STORAGE_KEY = 'andalucia-transit.language';
const DISMISSED_VALUE = 'dismissed';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

const LEGAL_DOCUMENTS = [
  ['/legal/privacy', 'Política de privacidad'],
  ['/legal/storage', 'Política de almacenamiento y cookies'],
  ['/legal/terms', 'Condiciones de uso'],
  ['/legal/notice', 'Aviso legal']
] as const;

test.describe('Legal and privacy surfaces', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((languageKey) => {
      window.localStorage.setItem(languageKey, 'es');
    }, LANGUAGE_STORAGE_KEY);
  });

  test('shows an informational first-visit notice and persists dismissal', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, '/legal/privacy');

    const notice = page.getByRole('region', { name: 'Privacidad y almacenamiento local' });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('button')).toHaveCount(1);
    await expect(notice.getByRole('button', { name: 'Entendido' })).toBeVisible();
    await expect(notice.getByRole('link', { name: 'Privacidad' })).toBeVisible();
    await expect(notice.getByRole('link', { name: 'Almacenamiento y cookies' })).toBeVisible();
    await expect(notice.getByRole('button', { name: /aceptar|rechazar/i })).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
    await assertControlIsUnobscured(page, notice.getByRole('button', { name: 'Entendido' }));

    await notice.getByRole('button', { name: 'Entendido' }).click();
    await expect(notice).toBeHidden();
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), STORAGE_NOTICE_KEY)).toBe(
      DISMISSED_VALUE
    );

    await page.reload();
    await expect(notice).toBeHidden();
  });

  test('keeps every legal document permanently reachable from the global footer', async ({ page }) => {
    await open(page, '/legal/privacy');
    await page.getByRole('button', { name: 'Entendido' }).click();

    const legalNavigation = page.getByRole('navigation', { name: 'Información legal y privacidad' });
    await expect(legalNavigation).toBeVisible();

    for (const [path, heading] of LEGAL_DOCUMENTS) {
      await open(page, path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(legalNavigation).toBeVisible();
    }
  });

  test('renders the legal surface in the stored English preference', async ({ page }) => {
    await page.addInitScript(
      ({ noticeKey, languageKey, dismissedValue }) => {
        window.localStorage.setItem(noticeKey, dismissedValue);
        window.localStorage.setItem(languageKey, 'en');
      },
      {
        noticeKey: STORAGE_NOTICE_KEY,
        languageKey: LANGUAGE_STORAGE_KEY,
        dismissedValue: DISMISSED_VALUE
      }
    );

    await open(page, '/legal/privacy');

    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Legal and privacy information' })).toBeVisible();
  });
});

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  ).toBe(true);
}

async function assertControlIsUnobscured(page: Page, control: Locator): Promise<void> {
  await expect(control).toBeVisible();

  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height);

  expect(
    await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const elementAtCenter = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      return elementAtCenter === element || element.contains(elementAtCenter);
    })
  ).toBe(true);
}
