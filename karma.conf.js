const { join } = require('node:path');
const { constants } = require('karma');
const { chromium } = require('playwright');

// Usar el Chrome de Playwright si no viene definido desde el entorno
let chromePath = process.env.CHROME_BIN;
if (!chromePath) {
  chromePath = chromium.executablePath();
  process.env.CHROME_BIN = chromePath;
}

// Configuración para el navegador
const chromeFlags = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-software-rasterizer',
  '--disable-web-security',
  '--no-zygote',
  '--disable-extensions',
  '--remote-debugging-port=9222',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-first-run',
  '--safebrowsing-disable-auto-update'
];

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: join(__dirname, './coverage/andalucia-transit'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: constants.LOG_INFO,
    browserNoActivityTimeout: 60000,
    autoWatch: false,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'Chrome',
        flags: chromeFlags,
        debug: false
      }
    },
    singleRun: true,
    autoWatch: false,
    restartOnFileChange: true,
  });
};
