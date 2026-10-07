import { createHash } from 'crypto';
import { mapCardExpenseToYnabExpense } from './expenseMapper.js';

const toDayMonthYear = (isoDay) => isoDay.split('-').reverse().join('-');
const foreignAmountNote = (txn) => (txn.originalCurrency !== 'ILS' ? `${Math.abs(txn.originalAmount)} ${txn.originalCurrency}` : '');
const normalizeDescription = (description) => description.trim().replace(/\s+/g, ' ');
const shortHash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 24);
const pendingImportId = (cardNumber, txn, ordinal) =>
  `max-pending:${shortHash(`${cardNumber}|${txn.date}|${txn.originalAmount}|${normalizeDescription(txn.description)}|${ordinal}`)}`;
const hasMaxIdentifier = (txn) => txn.identifier && String(txn.identifier) !== '0';
const completedImportId = (cardNumber, txn, ordinal) =>
  hasMaxIdentifier(txn)
    ? `max:${txn.identifier}`
    : `max-noid:${shortHash(`${cardNumber}|${txn.date}|${txn.chargedAmount}|${normalizeDescription(txn.description)}|${ordinal}`)}`;
const ilsRateByCurrency = (completedTxns) => {
  const totals = new Map();
  for (const txn of completedTxns) {
    if (txn.originalCurrency === 'ILS' || !txn.originalAmount || !txn.chargedAmount) continue;
    const total = totals.get(txn.originalCurrency) ?? { original: 0, charged: 0 };
    totals.set(txn.originalCurrency, { original: total.original + txn.originalAmount, charged: total.charged + txn.chargedAmount });
  }
  return new Map([...totals].map(([currency, { original, charged }]) => [currency, charged / original]));
};
const pendingIlsAmount = (txn, ilsRates) => {
  if (txn.originalCurrency === 'ILS') return txn.originalAmount;
  if (txn.chargedAmount) return txn.chargedAmount;
  const rate = ilsRates.get(txn.originalCurrency);
  return rate ? Math.round(txn.originalAmount * rate * 100) / 100 : txn.originalAmount;
};
const isSettledTwin = (pendingTxn, completedTxn) => {
  const pendingDescription = normalizeDescription(pendingTxn.description);
  const completedDescription = normalizeDescription(completedTxn.description);
  return (
    completedTxn.date === pendingTxn.date &&
    (pendingDescription.startsWith(completedDescription) || completedDescription.startsWith(pendingDescription))
  );
};

const tripFor = (trips, txn) =>
  trips.find(
    (trip) =>
      trip.currency === txn.originalCurrency &&
      txn.date >= trip.start_date &&
      txn.date <= trip.end_date &&
      !trip.excluded_max_categories.includes(txn.category),
  );

export const mapCardTransactions = async ({ cardAccounts, overridesMap, trips = [] }) => {
  const cardYnabAccountIds = { 6312: process.env.BARAK_CARD, 7626: process.env.ADI_CARD };
  const cards = [];

  for (const card of cardAccounts) {
    const accountId = cardYnabAccountIds[card.accountNumber];
    if (!accountId) continue;
    const isAdiCard = card.accountNumber === '7626';

    const completedTxns = card.txns.filter((t) => t.status === 'completed');
    const completed = [];
    const pending = [];
    let pendingSuperseded = 0;
    const pendingOrdinals = new Map();
    const completedOrdinals = new Map();
    const ilsRates = ilsRateByCurrency(completedTxns);

    for (const txn of card.txns) {
      const isPending = txn.status === 'pending';
      if (isPending && completedTxns.some((completedTxn) => isSettledTwin(txn, completedTxn))) {
        pendingSuperseded += 1;
        continue;
      }
      const foreignNote = foreignAmountNote(txn);
      const payload = await mapCardExpenseToYnabExpense(
        {
          date: toDayMonthYear(txn.date),
          payee_name: txn.description,
          cardCategory: txn.category,
          amount: isPending ? -pendingIlsAmount(txn, ilsRates) : -txn.chargedAmount,
          memo: isPending ? ['max-pending', foreignNote].filter(Boolean).join(' · ') : foreignNote,
        },
        isAdiCard,
        overridesMap,
      );
      if (!payload) continue;
      const trip = tripFor(trips, txn);
      const categorized = trip ? { ...payload, category_id: trip.category_id, baseCategoryId: payload.category_id } : payload;

      if (isPending) {
        const pendingKey = `${txn.date}|${txn.originalAmount}|${normalizeDescription(txn.description)}`;
        const ordinal = pendingOrdinals.get(pendingKey) ?? 0;
        pendingOrdinals.set(pendingKey, ordinal + 1);
        pending.push({ ...categorized, maxCategory: txn.category, cleared: 'uncleared', approved: true, flag_color: null, import_id: pendingImportId(card.accountNumber, txn, ordinal) });
      } else {
        const completedKey = `${txn.date}|${txn.chargedAmount}|${normalizeDescription(txn.description)}`;
        const ordinal = completedOrdinals.get(completedKey) ?? 0;
        completedOrdinals.set(completedKey, ordinal + 1);
        completed.push({ ...categorized, maxCategory: txn.category, cleared: 'cleared', approved: true, import_id: completedImportId(card.accountNumber, txn, ordinal) });
      }
    }

    cards.push({ accountNumber: card.accountNumber, accountId, completed, pending, pendingSuperseded });
  }

  return cards;
};
