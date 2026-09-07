import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CompanyTypes, createScraper } from 'israeli-bank-scrapers';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../downloads/bank-discount.json');

export const PUPPETEER_ARGS = [
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : []),
];

export const toIsraelDate = (isoString) =>
  new Date(isoString).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

const normalizeTxn = (txn) => ({
  ...txn,
  date: toIsraelDate(txn.date),
  processedDate: toIsraelDate(txn.processedDate),
});

export async function scrapeDiscount({ startDate, showBrowser = true } = {}) {
  const { DISCOUNT_ID, DISCOUNT_PASSWORD, DISCOUNT_NUM } = process.env;
  const missing = ['DISCOUNT_ID', 'DISCOUNT_PASSWORD', 'DISCOUNT_NUM'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing in .env: ${missing.join(', ')}`);

  const scraper = createScraper({
    companyId: CompanyTypes.discount,
    startDate,
    showBrowser,
    args: PUPPETEER_ARGS,
  });

  const result = await scraper.scrape({ id: DISCOUNT_ID, password: DISCOUNT_PASSWORD, num: DISCOUNT_NUM });
  if (!result.success) throw new Error(`Discount scrape failed: ${result.errorType} ${result.errorMessage ?? ''}`);

  const accounts = result.accounts.map((account) => ({ ...account, txns: account.txns.map(normalizeTxn) }));
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(accounts, null, 2));
  return accounts;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const daysBack = Number(process.argv[2] ?? 45);
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  console.log(`Scraping Discount from ${startDate.toISOString().slice(0, 10)} (${daysBack} days back)`);
  const accounts = await scrapeDiscount({ startDate });
  for (const account of accounts) {
    const txns = account.txns ?? [];
    const dates = txns.map((t) => t.date).sort();
    console.log(`account ${account.accountNumber}: balance ${account.balance ?? 'n/a'}, ${txns.length} transactions ${dates[0] ?? ''}..${dates[dates.length - 1] ?? ''}`);
    for (const t of txns.slice(-10)) {
      console.log(`  ${t.date} ${String(t.chargedAmount).padStart(11)} ${t.status.padEnd(9)} ref ${t.identifier} ${t.description}`);
    }
  }
  console.log(`saved to ${OUTPUT_PATH}`);
}
