import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CompanyTypes, createScraper } from 'israeli-bank-scrapers';
import { toIsraelDate } from './bank.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../downloads/cards-max.json');

export async function scrapeMax({ startDate, showBrowser = true } = {}) {
  const { CREDIT_CARD_USERNAME, CREDIT_CARD_PASSWORD } = process.env;
  if (!CREDIT_CARD_USERNAME || !CREDIT_CARD_PASSWORD) throw new Error('Missing CREDIT_CARD_USERNAME / CREDIT_CARD_PASSWORD in .env');

  const scraper = createScraper({
    companyId: CompanyTypes.max,
    startDate,
    showBrowser,
    combineInstallments: false,
  });

  const result = await scraper.scrape({ username: CREDIT_CARD_USERNAME, password: CREDIT_CARD_PASSWORD });
  if (!result.success) throw new Error(`Max scrape failed: ${result.errorType} ${result.errorMessage ?? ''}`);

  const accounts = result.accounts.map((account) => ({
    ...account,
    txns: account.txns.map((txn) => ({ ...txn, date: toIsraelDate(txn.date), processedDate: toIsraelDate(txn.processedDate) })),
  }));
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(accounts, null, 2));
  return accounts;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const daysBack = Number(process.argv[2] ?? 45);
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  console.log(`Scraping Max from ${startDate.toISOString().slice(0, 10)} (${daysBack} days back)`);
  const accounts = await scrapeMax({ startDate });
  for (const account of accounts) {
    const txns = account.txns ?? [];
    const dates = txns.map((t) => t.date).sort();
    const byStatus = txns.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }), {});
    console.log(`card ${account.accountNumber}: ${txns.length} transactions ${dates[0] ?? ''}..${dates[dates.length - 1] ?? ''} ${JSON.stringify(byStatus)}`);
    for (const t of txns.slice(-5)) {
      console.log(`  ${t.date} charged ${t.processedDate} ${String(t.chargedAmount).padStart(10)} ${t.status.padEnd(9)} ${t.type.padEnd(12)} ${t.description}`);
    }
  }
  console.log(`saved to ${OUTPUT_PATH}`);
}
