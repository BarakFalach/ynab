import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const isAdiCard = process.argv[2] === 'adi';
console.log('Mapping expenses for:', isAdiCard ? 'Adi' : 'Barak');

// Your login credentials
const username = process.env.CREDIT_CARD_USERNAME; // Use environment variables for security
const password = process.env.CREDIT_CARD_PASSWORD; // Use environment variables for security
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Logging in with username:', username);

(async () => {
  // Launch Chromium browser
  const browser = await chromium.launch({ headless: false }); // Set headless: true to run without a UI
  const page = await browser.newPage();

  // Set up the download path to ensure files are saved to the right location
  const downloadPath = path.resolve(__dirname, '../downloads');
  await page.setViewportSize({ width: 1280, height: 1024 });

  // Listen for the download event
  page.on('download', async (download) => {
    console.log('Download started:', download.suggestedFilename());

    // Define the path for the new file name
    const newFilePath = path.join(downloadPath, isAdiCard ? 'expenses2.xlsx' : 'expenses1.xlsx');
    
    // Delete the existing file if it exists to ensure it is overwritten
    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
      console.log('Existing file removed:', newFilePath);
    }

    // Save the downloaded file to the desired location
    await download.saveAs(newFilePath);
    console.log('Download saved to:', newFilePath);
  });

  console.log('Navigating to the login page');
  // await page.goto('https://www.max.co.il/login'); 
  await page.goto('https://www.max.co.il/login', { waitUntil: 'commit' });


  console.log('waiting for login page to load');
  await page.waitForSelector('span[_ngcontent-my-app-id-c147=""]', {
    timeout: 20000,
  }); // Wait for the login page to load
  console.log('login page loaded');
  await page.locator('span[_ngcontent-my-app-id-c147=""]').nth(1).click(); // password tab 
  await page.fill('[formcontrolname="username"]', username);
  await page.fill('[formcontrolname="password"]', password);
  await page.click('button[_ngcontent-my-app-id-c142=""]');

  await page.waitForSelector('.only-card-wrapper > :first-child'); // Wait for the card to load
  console.log('Logged in successfully!');
  isAdiCard ?
   await page.locator('div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c113][appgtm]').nth(2).click() :
   await page.locator('div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c113][appgtm]').nth(0).click(); // Click on the card

  await page.locator('span.download-excel').click();

  // Wait for the file to be downloaded
  await page.waitForTimeout(5000); // Wait for the download to complete (adjust if necessary)

  console.log('CSV file downloaded to:', downloadPath);

  // Close the browser
  await browser.close();
})();
