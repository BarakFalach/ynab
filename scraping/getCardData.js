import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadPath = path.resolve(__dirname, '../downloads');

// Human-like delay function
const humanDelay = (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Human-like typing function
const humanType = async (page, selector, text) => {
  await page.focus(selector);
  await humanDelay(500, 1000);
  
  for (const char of text) {
    await page.keyboard.type(char);
    await humanDelay(50, 150); // Random delay between keystrokes
  }
  await humanDelay(300, 800);
};

// Human-like click function
const humanClick = async (page, selector) => {
  const element = await page.locator(selector);
  await element.hover();
  await humanDelay(200, 500);
  await element.click();
  await humanDelay(500, 1000);
};

export async function downloadExpenses(isAdiCard) {
  console.log('⬇️ Download expenses for', isAdiCard ? 'Adi' : 'Barak');
  const username = process.env.CREDIT_CARD_USERNAME;
  const password = process.env.CREDIT_CARD_PASSWORD;

  // Launch browser with more human-like settings
  // Always run headless in Railway/production environment
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.PORT;
  console.log('🔧 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    PORT: process.env.PORT,
    isProduction: isProduction,
    headless: isProduction
  });
  
  const browser = await chromium.launch({ 
    headless: isProduction,
    args: [
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
      '--disable-renderer-backgrounding'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 }
  });
  
  const page = await context.newPage();

  // Set up download handler
  page.on('download', async (download) => {
    const newFilePath = path.join(downloadPath, isAdiCard ? 'expenses2.xlsx' : 'expenses1.xlsx');

    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }

    await download.saveAs(newFilePath);
  });

  try {
    console.log('🌐 Navigating to login page...');
    await page.goto('https://www.max.co.il/login', { waitUntil: 'networkidle' });
    await humanDelay(2000, 4000);

    console.log('🔍 Looking for login form...');
    await page.waitForSelector('span[_ngcontent-my-app-id-c168=""]', { timeout: 30000 });
    await humanDelay(1000, 2000);

    console.log('👆 Clicking password tab...');
    const passwordTab = page.locator('span[_ngcontent-my-app-id-c168=""]').nth(1);
    await passwordTab.hover();
    await humanDelay(500, 1000);
    await passwordTab.click();
    await humanDelay(1000, 2000);

    console.log('⌨️ Typing username...');
    const usernameField = page.locator('[formcontrolname="username"]');
    await usernameField.click();
    await humanDelay(500, 1000);
    await usernameField.fill(username);
    await humanDelay(1000, 2000);

    console.log('⌨️ Typing password...');
    const passwordField = page.locator('[formcontrolname="password"]');
    await passwordField.click();
    await humanDelay(500, 1000);
    await passwordField.fill(password);
    await humanDelay(1000, 2000);

    console.log('🚀 Clicking login button...');
    const loginButton = page.locator('button[_ngcontent-my-app-id-c163=""]');
    await loginButton.hover();
    await humanDelay(500, 1000);
    await loginButton.click();
    await humanDelay(3000, 5000);

    console.log('🔍 Waiting for dashboard to load...');
    await page.waitForSelector('.only-card-wrapper > :first-child', { timeout: 30000 });
    await humanDelay(2000, 3000);

    console.log('👆 Clicking on card...');
    await page.waitForSelector('span[_ngcontent-my-app-id-c118=""]', { timeout: 30000 });
    const cardSpan = page.locator('span[_ngcontent-my-app-id-c118=""]');
    await cardSpan.hover();
    await humanDelay(500, 1000);
    await cardSpan.click();
    await humanDelay(2000, 4000);

    console.log('💳 Selecting credit card...');
    const cardSelector = isAdiCard 
      ? 'div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c126][appgtm]:nth-child(3)'
      : 'div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c126][appgtm]:nth-child(1)';
    
    const cardElement = page.locator(cardSelector);
    await cardElement.hover();
    await humanDelay(500, 1000);
    await cardElement.click();
    await humanDelay(2000, 4000);

    console.log('📥 Clicking download button...');
    const downloadButton = page.locator('span.download-excel');
    await downloadButton.hover();
    await humanDelay(500, 1000);
    await downloadButton.click();
    await humanDelay(3000, 5000);

    console.log('📦 Expense downloaded for', isAdiCard ? 'Adi' : 'Barak');
    
  } catch (error) {
    console.error('❌ Error during scraping:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}