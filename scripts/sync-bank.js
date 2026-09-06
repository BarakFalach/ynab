import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { scrapeDiscount, toIsraelDate } from '../scraping/bank.js';
import { scrapeMax } from '../scraping/cards.js';
import { getBankRules } from '../supabase/bankRules.js';
import { mapBankTransactions } from '../mapper/bankMapper.js';
import { fetchYnabAccounts, fetchYnabBankAccount, fetchBankTransactionsSince, uploadBankTransactions } from '../ynabApi/bank.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const days = Number(flagValue('--days') ?? 30);
const offline = args.includes('--offline');
const upload = args.includes('--upload');
const rulesJsonPath = flagValue('--rules-json');
const jsonPath = flagValue('--json');

const DAY_MS = 24 * 60 * 60 * 1000;
const startDate = new Date(Date.now() - days * DAY_MS);
const startDay = toIsraelDate(startDate.toISOString());
const cardsStartDate = new Date(startDate.getTime() - 45 * DAY_MS);

const missingEnv = ['BANK_ACCOUNT', 'BARAK_CARD', 'ADI_CARD', 'YNAB_ACCESS_TOKEN', 'BUDGET_ID'].filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing in .env: ${missingEnv.join(', ')}`);
  process.exit(1);
}

console.log(`${upload ? 'UPLOAD' : 'DRY RUN'} · ${offline ? 'offline data' : 'live scrape'} · bank rows since ${startDay} (${days} days)`);

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8'));

const bankAccounts = offline
  ? readJson('downloads/bank-discount.json').map((account) => ({
      ...account,
      txns: account.txns.map((t) => ({ ...t, date: toIsraelDate(t.date), processedDate: toIsraelDate(t.processedDate) })),
    }))
  : await scrapeDiscount({ startDate, showBrowser: false });
const cardAccounts = offline ? readJson('downloads/cards-max.json') : await scrapeMax({ startDate: cardsStartDate, showBrowser: false });

const discountAccount = bankAccounts[0];
const bankTxns = discountAccount.txns.filter((t) => t.date >= startDay);
console.log(`Discount account ${discountAccount.accountNumber}: ${bankTxns.length} rows · cards: ${cardAccounts.map((c) => `${c.accountNumber} (${c.txns.length})`).join(', ')}`);

const ynabAccounts = await fetchYnabAccounts();
const rules = rulesJsonPath
  ? JSON.parse(fs.readFileSync(path.resolve(rulesJsonPath), 'utf8')).sort((a, b) => a.priority - b.priority || b.match_text.length - a.match_text.length)
  : await getBankRules();
console.log(`${ynabAccounts.length} YNAB accounts · ${rules.length} bank rules${rulesJsonPath ? ` from ${rulesJsonPath}` : ''}`);

const { transactions, unmatched } = mapBankTransactions({ bankTxns, cardAccounts, rules, ynabAccounts });

const existing = (await fetchBankTransactionsSince(startDay)).filter((t) => !t.deleted);
const unclaimed = new Set(existing);
const toUpload = [];
let alreadyInYnab = 0;
for (const candidate of transactions) {
  const match =
    [...unclaimed].find((e) => e.import_id && e.import_id === candidate.import_id) ??
    [...unclaimed].find((e) => e.date === candidate.date && e.amount === candidate.amount);
  if (match) {
    unclaimed.delete(match);
    alreadyInYnab += 1;
  } else {
    toUpload.push(candidate);
  }
}

const accountNameByTransferPayee = new Map(ynabAccounts.map((a) => [a.transfer_payee_id, a.name]));
const categoryNameById = new Map(rules.filter((r) => r.category_id).map((r) => [r.category_id, r.category_name]));
const uploadSet = new Set(toUpload);
const formatAmount = (milliunits) => (milliunits / 1000).toFixed(2).padStart(11);

console.log('\ndate        amount      target                                   category                              flag    status');
for (const t of transactions) {
  const target = t.payee_id ? `→ ${accountNameByTransferPayee.get(t.payee_id) ?? t.payee_id}` : t.payee_name;
  const category = t.category_id ? categoryNameById.get(t.category_id) ?? t.category_id : '';
  const status = uploadSet.has(t) ? (upload ? 'upload' : 'would upload') : 'in YNAB';
  console.log(`${t.date}  ${formatAmount(t.amount)} ${target.padEnd(40)} ${category.padEnd(37)} ${(t.flag_color ?? '').padEnd(7)} ${status}`);
}

console.log(`\nmapped ${transactions.length} · alreadyInYnab ${alreadyInYnab} · toUpload ${toUpload.length} · unmatched ${unmatched.length}`);
for (const u of unmatched) console.log(`  unmatched ${u.date} ${u.chargedAmount} ${u.description} (ref ${u.identifier}): ${u.reason}`);

let uploadResult = upload ? { created: 0, duplicateImportIds: 0 } : null;
if (upload && toUpload.length) {
  uploadResult = await uploadBankTransactions(toUpload);
  console.log(`uploaded: created ${uploadResult.created}, duplicate import ids ${uploadResult.duplicateImportIds}`);
}

const ynabBankAccount = await fetchYnabBankAccount();
const ynabBalance = ynabBankAccount.balance / 1000;
const difference = Math.round((ynabBalance - discountAccount.balance) * 100) / 100;
if (difference === 0) {
  console.log(`balance match ✓  YNAB ${ynabBalance.toFixed(2)} vs Discount ${discountAccount.balance.toFixed(2)}`);
} else {
  console.log(`balance differs: YNAB ${ynabBalance.toFixed(2)} vs Discount ${discountAccount.balance.toFixed(2)} (YNAB − Discount = ${difference.toFixed(2)})`);
}

if (jsonPath) {
  const bankTxnByImportId = new Map(bankTxns.map((b) => [`discount:${b.identifier}`, b]));
  const unmatchedReasonByIdentifier = new Map(unmatched.map((u) => [u.identifier, u.reason]));
  const rows = transactions.map((t) => {
    const bankTxn = bankTxnByImportId.get(t.import_id);
    return {
      date: t.date,
      amount: t.amount / 1000,
      description: bankTxn.description,
      identifier: bankTxn.identifier,
      payeeName: t.payee_name ?? null,
      transferAccountName: t.payee_id ? accountNameByTransferPayee.get(t.payee_id) ?? null : null,
      categoryName: t.category_id ? categoryNameById.get(t.category_id) ?? t.category_id : null,
      flag: t.flag_color ?? null,
      status: uploadSet.has(t) ? 'upload' : 'in YNAB',
      unmatchedReason: unmatchedReasonByIdentifier.get(bankTxn.identifier) ?? null,
    };
  });
  const report = {
    kind: 'bank',
    mode: upload ? 'upload' : 'dry-run',
    offline,
    sinceDate: startDay,
    generatedAt: new Date().toISOString(),
    counts: {
      mapped: transactions.length,
      alreadyInYnab,
      toUpload: toUpload.length,
      unmatched: unmatched.length,
      created: uploadResult?.created ?? null,
      duplicateImportIds: uploadResult?.duplicateImportIds ?? null,
    },
    rows,
    unmatched: rows.filter((r) => r.unmatchedReason),
    balance: { ynab: ynabBalance, bank: discountAccount.balance, match: difference === 0 },
  };
  fs.writeFileSync(path.resolve(jsonPath), JSON.stringify(report, null, 2));
  console.log(`report written to ${jsonPath}`);
}

if (difference !== 0 && upload) process.exit(1);
