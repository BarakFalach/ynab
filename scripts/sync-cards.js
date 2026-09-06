import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { toIsraelDate } from '../scraping/bank.js';
import { scrapeMax } from '../scraping/cards.js';
import { getOverridesMap } from '../supabase/overrides.js';
import { mapCardTransactions } from '../mapper/cardMapper.js';
import { fetchYnabAccounts } from '../ynabApi/bank.js';
import {
  fetchCategoryNames,
  fetchCardTransactionsSince,
  uploadCardTransactions,
  clearCardTransactions,
  deleteCardTransaction,
} from '../ynabApi/cards.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const days = Number(flagValue('--days') ?? 45);
const offline = args.includes('--offline');
const upload = args.includes('--upload');
const applyDeletes = args.includes('--apply-deletes');
const jsonPath = flagValue('--json');

const DAY_MS = 24 * 60 * 60 * 1000;
const startDate = new Date(Date.now() - days * DAY_MS);
const startDay = toIsraelDate(startDate.toISOString());
const scrapeStartDate = new Date(startDate.getTime() - DAY_MS);

const missingEnv = ['BARAK_CARD', 'ADI_CARD', 'YNAB_ACCESS_TOKEN', 'BUDGET_ID'].filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing in .env: ${missingEnv.join(', ')}`);
  process.exit(1);
}

console.log(
  `${upload ? 'UPLOAD' : 'DRY RUN'}${applyDeletes ? ' + DELETES' : ''} · ${offline ? 'offline data' : 'live scrape'} · card rows since ${startDay} (${days} days)`,
);

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8'));

const cardAccounts = (offline ? readJson('downloads/cards-max.json') : await scrapeMax({ startDate: scrapeStartDate, showBrowser: false })).map((card) => ({
  ...card,
  txns: card.txns.filter((t) => t.date >= startDay),
}));
console.log(`cards: ${cardAccounts.map((c) => `${c.accountNumber} (${c.txns.length})`).join(', ')}`);

const overridesMap = await getOverridesMap();
const categoryNameById = await fetchCategoryNames();
const ynabAccountNameById = new Map((await fetchYnabAccounts()).map((a) => [a.id, a.name]));
console.log(`${overridesMap.size} payee overrides · ${categoryNameById.size} YNAB categories`);

const cards = await mapCardTransactions({ cardAccounts, overridesMap });

const isRelevant = (t) => !t.deleted && !t.transfer_account_id && !(t.payee_name ?? '').includes('Reconciliation');
const isCleared = (t) => t.cleared !== 'uncleared';
const sumOf = (rows) => rows.reduce((total, r) => total + r.amount, 0);
const formatAmount = (milliunits) => (milliunits / 1000).toFixed(2).padStart(11);
const categoryLabel = (t) => (t.category_id ? categoryNameById.get(t.category_id) ?? t.category_name ?? t.category_id : '—');

const consistency = (card, ynabRows) => {
  const ynabCleared = ynabRows.filter(isCleared);
  const ynabUncleared = ynabRows.filter((t) => !isCleared(t));
  const sides = [
    { label: 'cleared', ynab: ynabCleared, max: card.completed, maxLabel: 'completed' },
    { label: 'uncleared', ynab: ynabUncleared, max: card.pending, maxLabel: 'pending' },
  ].map((side) => ({ ...side, ok: side.ynab.length === side.max.length && sumOf(side.ynab) === sumOf(side.max) }));
  const lines = sides.map(
    ({ label, ynab, max, maxLabel, ok }) =>
      `${ok ? '✓' : '✗'} YNAB ${label} since ${startDay}: ${ynab.length} rows / ${(sumOf(ynab) / 1000).toFixed(2)} vs Max ${maxLabel}: ${max.length} / ${(sumOf(max) / 1000).toFixed(2)}`,
  );
  const summary = Object.fromEntries(
    sides.map(({ label, ynab, max, ok }) => [
      label,
      { ynabRows: ynab.length, ynabSum: sumOf(ynab) / 1000, maxRows: max.length, maxSum: sumOf(max) / 1000, ok },
    ]),
  );
  return { ok: sides.every((s) => s.ok), lines, summary };
};

const report = {
  kind: 'cards',
  mode: upload ? (applyDeletes ? 'upload+deletes' : 'upload') : 'dry-run',
  offline,
  sinceDate: startDay,
  generatedAt: null,
  cards: [],
  uncategorized: [],
  totals: null,
};
const writeReport = () => {
  if (!jsonPath) return;
  report.generatedAt = new Date().toISOString();
  fs.writeFileSync(path.resolve(jsonPath), JSON.stringify(report, null, 2));
  console.log(`report written to ${jsonPath}`);
};

const plans = [];
for (const card of cards) {
  const existing = (await fetchCardTransactionsSince(card.accountId, startDay)).filter(isRelevant);
  const unclaimed = new Set(existing);
  const toUpload = [];
  const toClear = [];
  let completedMatched = 0;
  let pendingKept = 0;

  const unmatchedCompleted = [];
  for (const candidate of card.completed) {
    const match = [...unclaimed].find((e) => e.import_id && e.import_id === candidate.import_id);
    if (match) {
      unclaimed.delete(match);
      completedMatched += 1;
      if (!isCleared(match)) toClear.push(match);
    } else {
      unmatchedCompleted.push(candidate);
    }
  }
  for (const candidate of unmatchedCompleted) {
    const match = [...unclaimed].find((e) => e.date === candidate.date && e.amount === candidate.amount);
    if (match) {
      unclaimed.delete(match);
      completedMatched += 1;
      if (!isCleared(match)) toClear.push(match);
    } else {
      toUpload.push(candidate);
    }
  }

  for (const candidate of card.pending) {
    const match = [...unclaimed].find((e) => !isCleared(e) && e.date === candidate.date && e.amount === candidate.amount);
    if (match) {
      unclaimed.delete(match);
      pendingKept += 1;
    } else {
      toUpload.push(candidate);
    }
  }

  const staleToDelete = [...unclaimed].filter((e) => !isCleared(e));
  const extra = [...unclaimed].filter(isCleared);
  const uploadCompleted = toUpload.filter((t) => t.import_id);
  const uploadPending = toUpload.filter((t) => !t.import_id);
  const uncategorized = toUpload.filter((t) => !t.category_id);

  const actions = [
    ...uploadCompleted.map((t) => ({ ...t, action: 'upload-completed' })),
    ...uploadPending.map((t) => ({ ...t, action: 'upload-pending' })),
    ...toClear.map((t) => ({ ...t, action: 'clear' })),
    ...staleToDelete.map((t) => ({ ...t, action: 'delete-stale' })),
    ...extra.map((t) => ({ ...t, action: 'extra' })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\n=== card ${card.accountNumber} · ${existing.length} YNAB rows since ${startDay} ===`);
  if (actions.length) {
    console.log('date        amount      payee                                    category                              action');
    for (const t of actions) {
      console.log(`${t.date}  ${formatAmount(t.amount)} ${(t.payee_name ?? '').padEnd(40)} ${categoryLabel(t).padEnd(37)} ${t.action}`);
    }
  }
  console.log(
    `completed matched ${completedMatched} · toUpload completed ${uploadCompleted.length} · toUpload pending ${uploadPending.length} · pending kept ${pendingKept} · pendingSuperseded ${card.pendingSuperseded} · toClear ${toClear.length} · staleToDelete ${staleToDelete.length} · extra ${extra.length} · uncategorized uploads ${uncategorized.length}`,
  );
  if (staleToDelete.length && !(upload && applyDeletes)) console.log(`stale rows are listed only; pass --upload --apply-deletes to delete them`);

  const staleIds = new Set(staleToDelete.map((t) => t.id));
  const clearIds = new Set(toClear.map((t) => t.id));
  const afterPlannedActions = [
    ...existing.filter((t) => !(applyDeletes && staleIds.has(t.id))).map((t) => (clearIds.has(t.id) ? { ...t, cleared: 'cleared' } : t)),
    ...toUpload,
  ];
  const planned = consistency(card, afterPlannedActions);
  for (const line of planned.lines) console.log(`  ${line}`);

  const cardReport = {
    accountNumber: card.accountNumber,
    accountId: card.accountId,
    ynabAccountName: ynabAccountNameById.get(card.accountId) ?? null,
    counts: {
      completedMatched,
      toUploadCompleted: uploadCompleted.length,
      toUploadPending: uploadPending.length,
      pendingKept,
      pendingSuperseded: card.pendingSuperseded,
      toClear: toClear.length,
      staleToDelete: staleToDelete.length,
      extra: extra.length,
      uncategorizedUploads: uncategorized.length,
    },
    actions: actions.map((t) => ({
      action: t.action,
      date: t.date,
      amount: t.amount / 1000,
      payeeName: t.payee_name ?? null,
      categoryName: t.category_id ? categoryLabel(t) : null,
      maxCategory: t.maxCategory ?? null,
      ynabTransactionId: t.id ?? null,
    })),
    consistency: planned.summary,
    afterUpload: null,
  };
  report.cards.push(cardReport);
  report.uncategorized.push(
    ...uncategorized.map((t) => ({
      payeeName: t.payee_name,
      maxCategory: t.maxCategory ?? null,
      date: t.date,
      amount: t.amount / 1000,
      accountNumber: card.accountNumber,
    })),
  );

  plans.push({ card, cardReport, toUpload, toClear, staleToDelete });
}

if (!upload) {
  writeReport();
  process.exit(0);
}

const allToUpload = plans.flatMap((p) => p.toUpload);
let created = 0;
if (allToUpload.length) {
  const result = await uploadCardTransactions(allToUpload.map(({ maxCategory, ...t }) => t));
  created = result.created;
  console.log(`\nuploaded: created ${result.created}, duplicate import ids ${result.duplicateImportIds}`);
}

const allToClear = plans.flatMap((p) => p.toClear);
let cleared = 0;
if (allToClear.length) {
  cleared = await clearCardTransactions(allToClear.map((t) => t.id));
  console.log(`cleared: ${cleared} rows`);
}

let deleted = 0;
if (applyDeletes) {
  const allStale = plans.flatMap((p) => p.staleToDelete);
  for (const t of allStale) await deleteCardTransaction(t.id);
  deleted = allStale.length;
  console.log(`deleted stale: ${deleted} rows`);
}
report.totals = { created, cleared, deleted };

let allOk = true;
for (const { card, cardReport } of plans) {
  const rows = (await fetchCardTransactionsSince(card.accountId, startDay)).filter(isRelevant);
  const { ok, lines, summary } = consistency(card, rows);
  cardReport.afterUpload = summary;
  console.log(`\ncard ${card.accountNumber} after upload:`);
  for (const line of lines) console.log(`  ${line}`);
  allOk &&= ok;
}
writeReport();
if (!allOk) process.exit(1);
