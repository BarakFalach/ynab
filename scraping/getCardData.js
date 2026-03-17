import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { launchBrowser, humanDelay, humanClick, humanFill } from './browser.js';
import { LOGIN_URL, SELECTORS, getCardSelector } from './selectors.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const downloadPath = path.resolve(__dirname, '../downloads');

function getDownloadPath(isAdiCard) {
  return path.join(downloadPath, isAdiCard ? 'expenses2.xlsx' : 'expenses1.xlsx');
}

function setupDownloadHandler(page, isAdiCard) {
  page.on('download', async (download) => {
    const filePath = getDownloadPath(isAdiCard);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await download.saveAs(filePath);
  });
}

async function login(page) {
  const { username, password } = {
    username: process.env.CREDIT_CARD_USERNAME,
    password: process.env.CREDIT_CARD_PASSWORD,
  };

  console.log('🌐 Navigating to login page...');
  await page.goto(LOGIN_URL);
  await humanDelay(2000, 4000);

  console.log('🔍 Looking for login form...');
  await page.waitForSelector(SELECTORS.loginFormReady, { timeout: 30000 });
  await humanDelay(1000, 2000);

  console.log('👆 Clicking password tab...');
  const passwordTab = page.locator(SELECTORS.passwordTab).nth(1);
  await passwordTab.hover();
  await humanDelay(500, 1000);
  await passwordTab.click();
  await humanDelay(1000, 2000);

  console.log('⌨️ Typing credentials...');
  await humanFill(page, SELECTORS.usernameField, username);
  await humanFill(page, SELECTORS.passwordField, password);

  console.log('🚀 Clicking login button...');
  await humanClick(page, SELECTORS.loginButton);
  await humanDelay(3000, 5000);
}

async function dismissPopupIfVisible(page) {
  const closePopup = page.locator(SELECTORS.closePopup);
  if (await closePopup.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('🔲 Popup detected, closing it...');
    await closePopup.click();
    await humanDelay(1000, 2000);
  }
}

async function selectCardAndDownload(page, isAdiCard) {
  console.log('💳 Selecting credit card...');
  await humanClick(page, getCardSelector(isAdiCard));
  await humanDelay(2000, 4000);

  console.log('📥 Clicking download button...');
  await humanClick(page, SELECTORS.downloadExcel);
  await humanDelay(3000, 5000);
}

export async function downloadExpenses(isAdiCard) {
  const label = isAdiCard ? 'Adi' : 'Barak';
  console.log(`⬇️ Download expenses for ${label}`);

  const { browser, page } = await launchBrowser();
  setupDownloadHandler(page, isAdiCard);

  try {
    await login(page);

    console.log('🔍 Waiting for dashboard to load...');
    await page.waitForSelector(SELECTORS.dashboard, { timeout: 30000 });
    await humanDelay(2000, 3000);

    await dismissPopupIfVisible(page);
    await selectCardAndDownload(page, isAdiCard);

    console.log(`📦 Expense downloaded for ${label}`);
  } catch (error) {
    console.error('❌ Error during scraping:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}
