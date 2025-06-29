import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadPath = path.resolve(__dirname, '../downloads');

export async function downloadExpenses(isAdiCard) {
  console.log('Mapping expenses for:', isAdiCard ? 'Adi' : 'Barak');
  const username = process.env.CREDIT_CARD_USERNAME;
  const password = process.env.CREDIT_CARD_PASSWORD;

  console.log('Logging in with username:', username);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1024 });

  page.on('download', async (download) => {
    console.log('Download started:', download.suggestedFilename());
    const newFilePath = path.join(downloadPath, isAdiCard ? 'expenses2.xlsx' : 'expenses1.xlsx');

    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
      console.log('Existing file removed:', newFilePath);
    }

    await download.saveAs(newFilePath);
    console.log('Download saved to:', newFilePath);
  });

  console.log('Navigating to the login page');
  await page.goto('https://www.max.co.il/login', { waitUntil: 'commit' });
  console.log('Waiting for login page to load');
  await page.waitForSelector('span[_ngcontent-my-app-id-c168=""]', { timeout: 20000 });
  console.log('Login page loaded');
  await page.locator('span[_ngcontent-my-app-id-c168=""]').nth(1).click(); // password tab
  await page.fill('[formcontrolname="username"]', username);
  await page.fill('[formcontrolname="password"]', password);
  await page.click('button[_ngcontent-my-app-id-c163=""]');

  await page.waitForSelector('.only-card-wrapper > :first-child');
  console.log('Logged in successfully!');

  // announcement modal
  await page.waitForSelector('span[_ngcontent-my-app-id-c118=""]');
  await page.click('span[_ngcontent-my-app-id-c118=""]'); // click on the card

  isAdiCard
    ? await page.locator('div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c126][appgtm]').nth(2).click()
    : await page.locator('div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c126][appgtm]').nth(0).click();

  await page.locator('span.download-excel').click();
  await page.waitForTimeout(5000);
  console.log('CSV file downloaded to:', downloadPath);
  await browser.close();
}