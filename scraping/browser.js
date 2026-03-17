import { chromium } from 'playwright';

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function isHeadless() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.PORT;
  return Boolean(isProduction);
}

export async function launchBrowser() {
  const headless = isHeadless();

  console.log('🔧 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    PORT: process.env.PORT,
    headless,
  });

  const browser = await chromium.launch({ headless, args: BROWSER_ARGS });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();
  return { browser, page };
}

export const humanDelay = (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export const humanClick = async (page, selector) => {
  const element = page.locator(selector);
  await element.hover();
  await humanDelay(200, 500);
  await element.click();
  await humanDelay(500, 1000);
};

export const humanFill = async (page, selector, text) => {
  const field = page.locator(selector);
  await field.click();
  await humanDelay(500, 1000);
  await field.fill(text);
  await humanDelay(1000, 2000);
};
