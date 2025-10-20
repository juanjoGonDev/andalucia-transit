import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const FLAG_PREFIX = '--';
const ARG_SEPARATOR = '=';
const LIST_SEPARATOR = ',';
const KEY_VALUE_SEPARATOR = ':';
const STORAGE_VALUE_SEPARATOR = '=';
const COOKIE_PART_SEPARATOR = ';';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_RETRIES = 0;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_DEVICE_SCALE_FACTOR = 1;
const DEFAULT_TIMEZONE = 'Europe/Madrid';
const DEFAULT_COLOR_SCHEME = 'light';
const DEFAULT_LOCALES = ['es', 'en'];
const DEFAULT_OUTPUT_DIR = 'artifacts/screenshots';
const DEFAULT_NAME = 'capture';
const BOOLEAN_TRUE = 'true';
const BOOLEAN_FALSE = 'false';
const FILE_ENCODING = 'utf-8';
const WAIT_STATES = new Set(['load', 'domcontentloaded', 'networkidle', 'idle']);
const COLOR_SCHEMES = new Set(['light', 'dark', 'no-preference']);
const SCROLL_COMMAND_TOP = 'top';
const SCROLL_COMMAND_BOTTOM = 'bottom';
const ROLE_NAME_SEPARATOR = ':';
const ARIA_EXPECTATION_SEPARATOR = '=';
const MAP_IDLE_EVENT = 'idle';
const MAP_MOVE_END_EVENT = 'moveend';
const MAP_TILE_LOAD_EVENT = 'tileload';
const MAP_TILE_LOAD_START_EVENT = 'tileloadstart';
const MAP_TILE_CHECK_INTERVAL_MS = 200;
const MAP_TILE_CHECK_ATTEMPTS = 50;
const MASK_BLUR_VALUE = 'blur(12px)';
const BREAKPOINT_DIMENSION_SEPARATOR = 'x';
const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;
const LOG_KEY_EVENT = 'event';
const LOG_KEY_DETAILS = 'details';
const LOG_EVENT_START = 'start';
const LOG_EVENT_BROWSER = 'browser';
const LOG_EVENT_NAVIGATION = 'navigation';
const LOG_EVENT_WAIT = 'wait';
const LOG_EVENT_ACTION = 'action';
const LOG_EVENT_SCREENSHOT = 'screenshot';
const LOG_EVENT_STORAGE = 'storage';
const LOG_EVENT_WARNING = 'warning';
const LOG_EVENT_ERROR = 'error';
const LOG_EVENT_EXIT = 'exit';
const OFFLINE_WARNING_CODE = 'offlineValidation';
const NETWORK_PROFILES = {
  slow3g: { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 50000 },
  fast3g: { offline: false, latency: 150, downloadThroughput: 1800000, uploadThroughput: 750000 },
};

function logEvent(event, details) {
  const payload = {};
  payload[LOG_KEY_EVENT] = event;
  if (details !== undefined) {
    payload[LOG_KEY_DETAILS] = details;
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith(FLAG_PREFIX)) {
      continue;
    }
    const [flag, value] = token.slice(FLAG_PREFIX.length).split(ARG_SEPARATOR);
    if (value === undefined) {
      options[flag] = true;
      continue;
    }
    if (options[flag] === undefined) {
      options[flag] = value;
      continue;
    }
    if (Array.isArray(options[flag])) {
      options[flag].push(value);
      continue;
    }
    options[flag] = [options[flag], value];
  }
  return options;
}

function readSingle(value) {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }
  return value;
}

function readBoolean(value, fallback) {
  const candidate = readSingle(value);
  if (candidate === undefined) {
    return fallback;
  }
  if (candidate === BOOLEAN_TRUE) {
    return true;
  }
  if (candidate === BOOLEAN_FALSE) {
    return false;
  }
  return fallback;
}

function readNumber(value, fallback) {
  const candidate = readSingle(value);
  if (candidate === undefined) {
    return fallback;
  }
  const parsed = Number(candidate);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function readList(value) {
  if (value === undefined) {
    return [];
  }
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((entry) => entry.split(LIST_SEPARATOR)).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function ensureDirectory(target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

function parseStoragePair(value) {
  const separatorIndex = value.indexOf(STORAGE_VALUE_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error('Storage entries require key=value');
  }
  return { key: value.slice(0, separatorIndex), value: value.slice(separatorIndex + 1) };
}

function parseCookie(value) {
  const parts = value.split(COOKIE_PART_SEPARATOR).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  const cookie = {};
  for (const part of parts) {
    const separatorIndex = part.indexOf(STORAGE_VALUE_SEPARATOR);
    if (separatorIndex === -1) {
      continue;
    }
    const key = part.slice(0, separatorIndex).trim();
    const val = part.slice(separatorIndex + 1).trim();
    if (!cookie.name) {
      cookie.name = key;
      cookie.value = val;
      continue;
    }
    cookie[key.charAt(0).toLowerCase() + key.slice(1)] = val;
  }
  if (!cookie.name) {
    throw new Error('Cookie requires a name');
  }
  if (!cookie.value) {
    cookie.value = '';
  }
  return cookie;
}

function parseGeolocation(value) {
  const parts = value.split(LIST_SEPARATOR).map((entry) => Number(entry.trim()));
  if (parts.length < 2) {
    throw new Error('Geolocation requires latitude and longitude');
  }
  const [latitude, longitude, accuracy] = parts;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Geolocation values must be numeric');
  }
  return { latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : 0 };
}

function parseClip(value) {
  const parts = value.split(LIST_SEPARATOR).map((entry) => Number(entry.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error('Clip requires x,y,width,height');
  }
  const [x, y, width, height] = parts;
  return { x, y, width, height };
}

function parseScrollTarget(value) {
  if (value === SCROLL_COMMAND_TOP || value === SCROLL_COMMAND_BOTTOM) {
    return { command: value };
  }
  if (value.includes(LIST_SEPARATOR)) {
    const [xRaw, yRaw] = value.split(LIST_SEPARATOR);
    const x = Number(xRaw);
    const y = Number(yRaw);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Scroll coordinates must be numeric');
    }
    return { coordinates: { x, y } };
  }
  return { selector: value };
}

function parseTypedSelector(value, label) {
  const separatorIndex = value.indexOf(KEY_VALUE_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error(`${label} requires selector:value`);
  }
  return { selector: value.slice(0, separatorIndex), value: value.slice(separatorIndex + 1) };
}

function parseBreakpoints(values) {
  return values.map((value) => {
    if (value.includes(BREAKPOINT_DIMENSION_SEPARATOR)) {
      const [widthRaw, heightRaw] = value.split(BREAKPOINT_DIMENSION_SEPARATOR);
      const width = Number(widthRaw);
      const height = Number(heightRaw);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new Error('Breakpoint requires numeric width and height');
      }
      return { width, height };
    }
    const width = Number(value);
    if (!Number.isFinite(width)) {
      throw new Error('Breakpoint width must be numeric');
    }
    return { width, height: undefined };
  });
}

function parseScenario(inlineSteps, scenarioPath) {
  if (inlineSteps && scenarioPath) {
    throw new Error('Use steps or scenario, not both');
  }
  if (inlineSteps) {
    return JSON.parse(inlineSteps);
  }
  if (scenarioPath) {
    const content = fs.readFileSync(scenarioPath, FILE_ENCODING);
    return JSON.parse(content);
  }
  return null;
}

function deriveLocales(values, breakpointCount) {
  if (values.length > 0) {
    return values;
  }
  if (breakpointCount > 1) {
    return DEFAULT_LOCALES;
  }
  return [DEFAULT_LOCALES[0]];
}

function captureName(base, width, height, locale, variant) {
  const parts = [base];
  if (locale) {
    parts.push(locale);
  }
  if (width) {
    parts.push(String(width));
  }
  if (height) {
    parts.push(String(height));
  }
  if (variant) {
    parts.push(variant);
  }
  return parts.filter(Boolean).join('_');
}

async function withRetries(task, retries, delay) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await task();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
  throw new Error('Retry limit reached');
}

async function ensureLeafletMap(page, timeout) {
  await page.waitForFunction(() => {
    const candidate = window.__leafletMap ?? window.map;
    return Boolean(candidate && typeof candidate.setView === 'function');
  }, { timeout });
}

async function waitForMapIdle(page, timeout) {
  await ensureLeafletMap(page, timeout);
  await page.evaluate(async ({ idleEvent, moveEndEvent }) => {
    const map = window.__leafletMap ?? window.map;
    if (!map) {
      throw new Error('Leaflet map not found');
    }
    await new Promise((resolve) => {
      const handler = () => {
        map.off(idleEvent, handler);
        map.off(moveEndEvent, handler);
        resolve(true);
      };
      map.on(idleEvent, handler);
      map.on(moveEndEvent, handler);
    });
  }, { idleEvent: MAP_IDLE_EVENT, moveEndEvent: MAP_MOVE_END_EVENT });
}

async function waitForTiles(page, timeout) {
  await ensureLeafletMap(page, timeout);
  await page.evaluate(({ loadEvent, loadStartEvent, intervalMs, attempts }) => {
    const map = window.__leafletMap ?? window.map;
    if (!map) {
      throw new Error('Leaflet map not found');
    }
    const layers = map._layers ? Object.values(map._layers) : [];
    const tileLayer = layers.find((layer) => layer._tiles);
    if (!tileLayer) {
      throw new Error('Tile layer not found');
    }
    let pending = 0;
    tileLayer.on(loadStartEvent, () => {
      pending += 1;
    });
    tileLayer.on(loadEvent, () => {
      pending = Math.max(pending - 1, 0);
    });
    return new Promise((resolve) => {
      let remaining = attempts;
      const interval = setInterval(() => {
        remaining -= 1;
        if (pending === 0 || remaining <= 0) {
          clearInterval(interval);
          resolve(true);
        }
      }, intervalMs);
    });
  }, { loadEvent: MAP_TILE_LOAD_EVENT, loadStartEvent: MAP_TILE_LOAD_START_EVENT, intervalMs: MAP_TILE_CHECK_INTERVAL_MS, attempts: MAP_TILE_CHECK_ATTEMPTS });
}

async function executeAction(page, action, selector, value, timeout) {
  if (!selector) {
    throw new Error(`${action} requires selector`);
  }
  if (action === 'hover') {
    await page.locator(selector).hover({ timeout });
    return;
  }
  if (action === 'click') {
    await page.locator(selector).click({ timeout });
    return;
  }
  if (action === 'dblclick') {
    await page.locator(selector).dblclick({ timeout });
    return;
  }
  if (action === 'focus') {
    await page.locator(selector).focus({ timeout });
    return;
  }
  if (action === 'type') {
    const locator = page.locator(selector);
    await locator.click({ timeout });
    await locator.fill('', { timeout });
    await locator.type(value ?? '', { timeout });
    return;
  }
  if (action === 'press') {
    await page.locator(selector).press(value ?? '', { timeout });
    return;
  }
  if (action === 'select') {
    await page.locator(selector).selectOption(value ?? '', { timeout });
  }
}

async function executeScroll(page, target, timeout) {
  if (target.command === SCROLL_COMMAND_TOP) {
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
    return;
  }
  if (target.command === SCROLL_COMMAND_BOTTOM) {
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
    });
    return;
  }
  if (target.coordinates) {
    await page.evaluate(({ x, y }) => {
      window.scrollTo({ left: x, top: y, behavior: 'auto' });
    }, target.coordinates);
    return;
  }
  if (target.selector) {
    await page.locator(target.selector).scrollIntoViewIfNeeded({ timeout });
  }
}

async function executeByRole(page, descriptor, timeout) {
  const [role, name] = descriptor.split(ROLE_NAME_SEPARATOR);
  if (!role || !name) {
    throw new Error('byRole requires role:name');
  }
  await page.getByRole(role, { name }).click({ timeout });
}

function parseAssertAria(value) {
  const separatorIndex = value.indexOf(KEY_VALUE_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error('assertAria requires selector:attribute=value');
  }
  const selector = value.slice(0, separatorIndex);
  const expectation = value.slice(separatorIndex + 1);
  const expectationSeparator = expectation.indexOf(ARIA_EXPECTATION_SEPARATOR);
  if (expectationSeparator === -1) {
    throw new Error('assertAria requires attribute=value');
  }
  const attribute = expectation.slice(0, expectationSeparator);
  const expected = expectation.slice(expectationSeparator + 1);
  return { selector, attribute, expected };
}

async function runScenario(page, steps, timeout) {
  for (const step of steps) {
    const continueOnError = Boolean(step.continueOnError);
    const stepTimeout = step.timeout ?? timeout;
    try {
      if (step.type === 'goto') {
        if (!step.url) {
          throw new Error('goto requires url');
        }
        await page.goto(step.url, { timeout: stepTimeout, waitUntil: step.waitState ?? 'load' });
      } else if (step.type === 'waitFor') {
        if (!step.selector) {
          throw new Error('waitFor requires selector');
        }
        await page.waitForSelector(step.selector, { timeout: stepTimeout });
      } else if (step.type === 'waitHidden') {
        if (!step.selector) {
          throw new Error('waitHidden requires selector');
        }
        await page.waitForSelector(step.selector, { state: 'hidden', timeout: stepTimeout });
      } else if (step.type === 'hover') {
        await executeAction(page, 'hover', step.selector, null, stepTimeout);
      } else if (step.type === 'click') {
        await executeAction(page, 'click', step.selector, null, stepTimeout);
      } else if (step.type === 'dblclick') {
        await executeAction(page, 'dblclick', step.selector, null, stepTimeout);
      } else if (step.type === 'focus') {
        await executeAction(page, 'focus', step.selector, null, stepTimeout);
      } else if (step.type === 'type') {
        await executeAction(page, 'type', step.selector, step.text ?? '', stepTimeout);
      } else if (step.type === 'press') {
        await executeAction(page, 'press', step.selector, step.keys ?? '', stepTimeout);
      } else if (step.type === 'select') {
        await executeAction(page, 'select', step.selector, step.option ?? '', stepTimeout);
      } else if (step.type === 'scrollTo') {
        const target = step.selector ? { selector: step.selector } : step.x !== undefined && step.y !== undefined ? { coordinates: { x: step.x, y: step.y } } : step.command ? { command: step.command } : null;
        if (!target) {
          throw new Error('scrollTo requires selector, coordinates, or command');
        }
        await executeScroll(page, target, stepTimeout);
      } else if (step.type === 'eval') {
        if (!step.script) {
          throw new Error('eval requires script');
        }
        await page.evaluate(step.script);
      } else if (step.type === 'evalFile') {
        if (!step.path) {
          throw new Error('evalFile requires path');
        }
        const script = fs.readFileSync(step.path, FILE_ENCODING);
        await page.evaluate(script);
      } else if (step.type === 'sleep') {
        if (typeof step.duration !== 'number') {
          throw new Error('sleep requires duration');
        }
        await new Promise((resolve) => setTimeout(resolve, step.duration));
      } else if (step.type === 'assertAria') {
        if (!step.selector || !step.attribute || step.value === undefined) {
          throw new Error('assertAria requires selector, attribute, and value');
        }
        const attribute = await page.getAttribute(step.selector, step.attribute, { timeout: stepTimeout });
        if (attribute !== String(step.value)) {
          throw new Error(`ARIA attribute mismatch for ${step.selector}`);
        }
      } else if (step.type === 'setMapCenter') {
        if (typeof step.lat !== 'number' || typeof step.lon !== 'number') {
          throw new Error('setMapCenter requires lat and lon');
        }
        await ensureLeafletMap(page, stepTimeout);
        await page.evaluate(({ lat, lon }) => {
          const map = window.__leafletMap ?? window.map;
          if (!map || typeof map.setView !== 'function') {
            throw new Error('Leaflet map not found');
          }
          map.setView([lat, lon]);
        }, { lat: step.lat, lon: step.lon });
      } else if (step.type === 'setMapZoom') {
        if (typeof step.zoom !== 'number') {
          throw new Error('setMapZoom requires zoom');
        }
        await ensureLeafletMap(page, stepTimeout);
        await page.evaluate(({ zoom }) => {
          const map = window.__leafletMap ?? window.map;
          if (!map || typeof map.setZoom !== 'function') {
            throw new Error('Leaflet map not found');
          }
          map.setZoom(zoom);
        }, { zoom: step.zoom });
      } else if (step.type === 'waitMapIdle') {
        await waitForMapIdle(page, stepTimeout);
      } else if (step.type === 'waitTilesLoaded') {
        await waitForTiles(page, stepTimeout);
      } else if (step.type === 'clickMapMarker') {
        if (!step.selector && !step.dataAttribute) {
          throw new Error('clickMapMarker requires selector or dataAttribute');
        }
        await ensureLeafletMap(page, stepTimeout);
        if (step.selector) {
          await page.locator(step.selector).click({ timeout: stepTimeout });
        } else {
          await page.evaluate(({ attribute }) => {
            const marker = document.querySelector(`[data-marker="${attribute}"]`);
            if (!marker) {
              throw new Error('Marker not found');
            }
            marker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, { attribute: step.dataAttribute });
        }
      } else if (step.type === 'waitState') {
        if (!step.state || !WAIT_STATES.has(step.state)) {
          throw new Error('waitState requires a supported state');
        }
        await page.waitForLoadState(step.state, { timeout: stepTimeout });
      } else {
        throw new Error(`Unsupported step type ${step.type}`);
      }
    } catch (error) {
      if (continueOnError) {
        logEvent(LOG_EVENT_WARNING, { step: step.type, message: error.message });
        continue;
      }
      throw error;
    }
  }
}

async function applyMasks(page, selectors) {
  if (selectors.length === 0) {
    return;
  }
  const rules = selectors.map((selector) => `${selector} { filter: ${MASK_BLUR_VALUE}; }`).join('\n');
  await page.addStyleTag({ content: rules });
}

async function captureConsole(page, destination) {
  const entries = [];
  page.on('console', (message) => {
    entries.push({ type: message.type(), text: message.text() });
  });
  return () => {
    if (!destination) {
      return;
    }
    ensureDirectory(path.dirname(destination));
    fs.writeFileSync(destination, `${JSON.stringify(entries, null, 2)}\n`, FILE_ENCODING);
  };
}

async function prepareNetwork(context, page, profile, cpuSlowdown) {
  if (!profile && !cpuSlowdown) {
    return null;
  }
  const session = await context.newCDPSession(page);
  if (cpuSlowdown) {
    await session.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  }
  if (profile) {
    const config = NETWORK_PROFILES[profile];
    if (!config) {
      throw new Error('Unsupported throttle profile');
    }
    await session.send('Network.emulateNetworkConditions', config);
  }
  return session;
}

async function validateOffline(page, timeout) {
  try {
    await page.waitForLoadState('load', { timeout });
  } catch (error) {
    logEvent(LOG_EVENT_WARNING, { code: OFFLINE_WARNING_CODE, message: error.message });
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const targetUrl = readSingle(args.url);
  if (!targetUrl) {
    throw new Error('url flag is required');
  }
  const timeout = readNumber(args.timeout, DEFAULT_TIMEOUT_MS);
  const retries = readNumber(args.retries, DEFAULT_RETRIES);
  const retryDelay = readNumber(args.retryDelay, DEFAULT_RETRY_DELAY_MS);
  const width = readNumber(args.width, DEFAULT_WIDTH);
  const height = readNumber(args.height, DEFAULT_HEIGHT);
  const deviceScaleFactor = readNumber(args.deviceScaleFactor, DEFAULT_DEVICE_SCALE_FACTOR);
  const userAgent = readSingle(args.userAgent);
  const localeValues = readList(args.locale);
  const timezone = readSingle(args.timezone) ?? DEFAULT_TIMEZONE;
  const colorScheme = readSingle(args.colorScheme) ?? DEFAULT_COLOR_SCHEME;
  if (!COLOR_SCHEMES.has(colorScheme)) {
    throw new Error('Unsupported color scheme');
  }
  const offline = readBoolean(args.offline, false);
  const ignoreHttpsErrors = readBoolean(args.ignoreHttpsErrors, true);
  const throttleProfile = readSingle(args.throttle);
  const cpuSlowdown = readNumber(args.cpuSlowdown, 0);
  const permissions = readList(args.grantPermissions);
  const geolocationValue = readSingle(args.geolocation);
  const cookies = readList(args.cookie).map(parseCookie);
  const localStorage = readList(args.localStorage).map(parseStoragePair);
  const sessionStorage = readList(args.sessionStorage).map(parseStoragePair);
  const storageStateRaw = readSingle(args.storageState);
  const storageStatePath = storageStateRaw ? path.resolve(storageStateRaw) : null;
  const hoverSelector = readSingle(args.hover);
  const clickSelector = readSingle(args.click);
  const dblclickSelector = readSingle(args.dblclick);
  const focusSelector = readSingle(args.focus);
  const typeEntry = args.type ? parseTypedSelector(readSingle(args.type), 'type') : null;
  const pressEntry = args.press ? parseTypedSelector(readSingle(args.press), 'press') : null;
  const selectEntry = args.select ? parseTypedSelector(readSingle(args.select), 'select') : null;
  const scrollEntry = args.scrollTo ? parseScrollTarget(readSingle(args.scrollTo)) : null;
  const evalScript = readSingle(args.eval);
  const evalFileRaw = readSingle(args.evalFile);
  const evalFile = evalFileRaw ? path.resolve(evalFileRaw) : null;
  const steps = parseScenario(readSingle(args.steps), readSingle(args.scenario));
  const waitForSelector = readSingle(args.waitFor);
  const waitHiddenSelector = readSingle(args.waitHidden);
  const waitState = readSingle(args.waitState);
  if (waitState && !WAIT_STATES.has(waitState)) {
    throw new Error('Unsupported wait state');
  }
  const mapCenterValue = readSingle(args.mapCenter);
  const mapZoomValue = readSingle(args.mapZoom);
  const waitMapIdle = readBoolean(args.waitMapIdle, false);
  const waitTilesLoaded = readBoolean(args.waitTilesLoaded, false);
  const clickMapMarkerValue = readSingle(args.clickMapMarker);
  const byRoleValue = readSingle(args.byRole);
  const assertAriaValue = readSingle(args.assertAria);
  const fullPage = readBoolean(args.fullPage, false);
  const elementSelector = readSingle(args.element);
  const clipValue = readSingle(args.clip);
  const maskSelectors = readList(args.mask);
  const outputDir = path.resolve(readSingle(args.outDir) ?? DEFAULT_OUTPUT_DIR);
  const nameBase = readSingle(args.name) ?? DEFAULT_NAME;
  const breakpointValues = parseBreakpoints(readList(args.breakpoints));
  const harRaw = readSingle(args.har);
  const consoleRaw = readSingle(args.consoleLog);
  const harPath = harRaw ? (path.isAbsolute(harRaw) ? harRaw : path.join(outputDir, harRaw)) : null;
  const consolePath = consoleRaw ? (path.isAbsolute(consoleRaw) ? consoleRaw : path.join(outputDir, consoleRaw)) : null;
  const locales = deriveLocales(localeValues, breakpointValues.length > 0 ? breakpointValues.length : 1);
  const clipRegion = clipValue ? parseClip(clipValue) : undefined;
  const geolocation = geolocationValue ? parseGeolocation(geolocationValue) : undefined;
  const mapCenter = mapCenterValue ? parseGeolocation(mapCenterValue) : null;
  const mapZoom = mapZoomValue ? Number(mapZoomValue) : null;
  if (mapZoomValue && !Number.isFinite(mapZoom)) {
    throw new Error('Map zoom must be numeric');
  }
  const clickMapMarker = clickMapMarkerValue ?? null;
  const assertAria = assertAriaValue ? parseAssertAria(assertAriaValue) : null;
  ensureDirectory(outputDir);
  logEvent(LOG_EVENT_START, { url: targetUrl, outputDir });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of locales) {
      const breakpoints = breakpointValues.length > 0 ? breakpointValues : [{ width, height }];
      for (const breakpoint of breakpoints) {
        await withRetries(async () => {
          const viewport = { width: breakpoint.width ?? width, height: breakpoint.height ?? height };
          const contextOptions = {
            viewport,
            deviceScaleFactor,
            userAgent,
            locale,
            timezoneId: timezone,
            colorScheme,
            permissions,
            geolocation,
            javaScriptEnabled: true,
            ignoreHTTPSErrors: ignoreHttpsErrors,
          };
          if (storageStatePath && fs.existsSync(storageStatePath)) {
            contextOptions.storageState = storageStatePath;
          }
          if (harPath) {
            ensureDirectory(path.dirname(harPath));
            contextOptions.recordHar = { path: harPath, content: 'embed' };
          }
          const context = await browser.newContext(contextOptions);
          try {
            if (offline) {
              await context.setOffline(true);
              logEvent(LOG_EVENT_BROWSER, { mode: 'offline' });
            }
            if (cookies.length > 0) {
              await context.addCookies(cookies);
              logEvent(LOG_EVENT_STORAGE, { type: 'cookie', count: cookies.length });
            }
            const page = await context.newPage();
            const finalizeConsole = await captureConsole(page, consolePath);
            if (consolePath) {
              logEvent(LOG_EVENT_BROWSER, { console: consolePath });
            }
            const session = await prepareNetwork(context, page, throttleProfile, cpuSlowdown);
            if (harPath) {
              logEvent(LOG_EVENT_BROWSER, { har: harPath });
            }
            if (permissions.length > 0) {
              logEvent(LOG_EVENT_BROWSER, { permissions });
            }
            if (geolocation) {
              logEvent(LOG_EVENT_BROWSER, { geolocation });
            }
            if (throttleProfile) {
              logEvent(LOG_EVENT_BROWSER, { networkProfile: throttleProfile });
            }
            if (cpuSlowdown) {
              logEvent(LOG_EVENT_BROWSER, { cpuSlowdown });
            }
            logEvent(LOG_EVENT_BROWSER, { viewport, locale, userAgent, colorScheme, ignoreHttpsErrors });
            if (localStorage.length > 0) {
              await page.addInitScript(({ entries }) => {
                entries.forEach(([key, value]) => {
                  window.localStorage.setItem(key, value);
                });
              }, { entries: localStorage.map((entry) => [entry.key, entry.value]) });
              logEvent(LOG_EVENT_STORAGE, { type: 'localStorage', count: localStorage.length });
            }
            if (sessionStorage.length > 0) {
              await page.addInitScript(({ entries }) => {
                entries.forEach(([key, value]) => {
                  window.sessionStorage.setItem(key, value);
                });
              }, { entries: sessionStorage.map((entry) => [entry.key, entry.value]) });
              logEvent(LOG_EVENT_STORAGE, { type: 'sessionStorage', count: sessionStorage.length });
            }
            await page.goto(targetUrl, { waitUntil: waitState ?? 'load', timeout });
            logEvent(LOG_EVENT_NAVIGATION, { url: targetUrl, locale, viewport });
            if (offline) {
              await validateOffline(page, timeout);
            }
            if (waitForSelector) {
              await page.waitForSelector(waitForSelector, { timeout });
              logEvent(LOG_EVENT_WAIT, { selector: waitForSelector, state: 'visible' });
            }
            if (waitHiddenSelector) {
              await page.waitForSelector(waitHiddenSelector, { state: 'hidden', timeout });
              logEvent(LOG_EVENT_WAIT, { selector: waitHiddenSelector, state: 'hidden' });
            }
            if (byRoleValue) {
              await executeByRole(page, byRoleValue, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'byRole', value: byRoleValue });
            }
            if (hoverSelector) {
              await executeAction(page, 'hover', hoverSelector, null, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'hover', selector: hoverSelector });
            }
            if (focusSelector) {
              await executeAction(page, 'focus', focusSelector, null, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'focus', selector: focusSelector });
            }
            if (clickSelector) {
              await executeAction(page, 'click', clickSelector, null, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'click', selector: clickSelector });
            }
            if (dblclickSelector) {
              await executeAction(page, 'dblclick', dblclickSelector, null, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'dblclick', selector: dblclickSelector });
            }
            if (typeEntry) {
              await executeAction(page, 'type', typeEntry.selector, typeEntry.value, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'type', selector: typeEntry.selector });
            }
            if (pressEntry) {
              await executeAction(page, 'press', pressEntry.selector, pressEntry.value, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'press', selector: pressEntry.selector, keys: pressEntry.value });
            }
            if (selectEntry) {
              await executeAction(page, 'select', selectEntry.selector, selectEntry.value, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'select', selector: selectEntry.selector, option: selectEntry.value });
            }
            if (scrollEntry) {
              await executeScroll(page, scrollEntry, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'scrollTo', target: scrollEntry });
            }
            if (evalScript) {
              await page.evaluate(evalScript);
              logEvent(LOG_EVENT_ACTION, { action: 'eval' });
            }
            if (evalFile) {
              const script = fs.readFileSync(evalFile, FILE_ENCODING);
              await page.evaluate(script);
              logEvent(LOG_EVENT_ACTION, { action: 'evalFile', path: evalFile });
            }
            if (mapCenter) {
              await ensureLeafletMap(page, timeout);
              await page.evaluate(({ lat, lon }) => {
                const map = window.__leafletMap ?? window.map;
                if (!map || typeof map.setView !== 'function') {
                  throw new Error('Leaflet map not found');
                }
                map.setView([lat, lon]);
              }, { lat: mapCenter.latitude, lon: mapCenter.longitude });
              logEvent(LOG_EVENT_ACTION, { action: 'mapCenter', lat: mapCenter.latitude, lon: mapCenter.longitude });
            }
            if (Number.isFinite(mapZoom)) {
              await ensureLeafletMap(page, timeout);
              await page.evaluate(({ zoom }) => {
                const map = window.__leafletMap ?? window.map;
                if (!map || typeof map.setZoom !== 'function') {
                  throw new Error('Leaflet map not found');
                }
                map.setZoom(zoom);
              }, { zoom: mapZoom });
              logEvent(LOG_EVENT_ACTION, { action: 'mapZoom', zoom: mapZoom });
            }
            if (waitMapIdle) {
              await waitForMapIdle(page, timeout);
              logEvent(LOG_EVENT_WAIT, { type: 'mapIdle' });
            }
            if (waitTilesLoaded) {
              await waitForTiles(page, timeout);
              logEvent(LOG_EVENT_WAIT, { type: 'tilesLoaded' });
            }
            if (clickMapMarker) {
              await ensureLeafletMap(page, timeout);
              await page.evaluate(({ target }) => {
                const bySelector = document.querySelector(target);
                if (bySelector) {
                  bySelector.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  return;
                }
                const byData = document.querySelector(`[data-marker="${target}"]`);
                if (!byData) {
                  throw new Error('Map marker not found');
                }
                byData.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              }, { target: clickMapMarker });
              logEvent(LOG_EVENT_ACTION, { action: 'clickMapMarker', target: clickMapMarker });
            }
            if (assertAria) {
              const value = await page.getAttribute(assertAria.selector, assertAria.attribute, { timeout });
              if (value !== assertAria.expected) {
                throw new Error(`ARIA mismatch for ${assertAria.selector}`);
              }
              logEvent(LOG_EVENT_ACTION, { action: 'assertAria', selector: assertAria.selector, attribute: assertAria.attribute });
            }
            if (steps) {
              await runScenario(page, steps, timeout);
              logEvent(LOG_EVENT_ACTION, { action: 'scenario', count: steps.length });
            }
            await applyMasks(page, maskSelectors);
            if (maskSelectors.length > 0) {
              logEvent(LOG_EVENT_ACTION, { action: 'mask', count: maskSelectors.length });
            }
            const variant = elementSelector ? 'element' : fullPage ? 'full' : 'viewport';
            const capturePath = path.join(outputDir, `${captureName(nameBase, viewport.width, viewport.height, locale, variant)}.png`);
            if (elementSelector) {
              const elementHandle = await page.$(elementSelector);
              if (!elementHandle) {
                throw new Error('Target element not found');
              }
              await elementHandle.screenshot({ path: capturePath });
            } else {
              const options = { path: capturePath, fullPage };
              if (clipRegion) {
                options.clip = clipRegion;
              }
              await page.screenshot(options);
            }
            logEvent(LOG_EVENT_SCREENSHOT, { path: capturePath });
            if (storageStatePath) {
              ensureDirectory(path.dirname(storageStatePath));
              await context.storageState({ path: storageStatePath });
            }
            finalizeConsole();
            if (session) {
              await session.detach();
            }
          } finally {
            await context.close();
          }
        }, retries, retryDelay);
      }
    }
  } finally {
    await browser.close();
  }
  logEvent(LOG_EVENT_EXIT, { code: EXIT_CODE_SUCCESS });
}

main().catch((error) => {
  logEvent(LOG_EVENT_ERROR, { message: error.message });
  process.exit(EXIT_CODE_FAILURE);
});
