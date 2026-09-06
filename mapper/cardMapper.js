import { mapCardExpenseToYnabExpense } from './expenseMapper.js';

const toDayMonthYear = (isoDay) => isoDay.split('-').reverse().join('-');
const foreignAmountNote = (txn) => (txn.originalCurrency !== 'ILS' ? `${Math.abs(txn.originalAmount)} ${txn.originalCurrency}` : '');
const normalizeDescription = (description) => description.trim().replace(/\s+/g, ' ');
const isSettledTwin = (pendingTxn, completedTxn) => {
  const pendingDescription = normalizeDescription(pendingTxn.description);
  const completedDescription = normalizeDescription(completedTxn.description);
  return (
    completedTxn.date === pendingTxn.date &&
    (pendingDescription.startsWith(completedDescription) || completedDescription.startsWith(pendingDescription))
  );
};

export const mapCardTransactions = async ({ cardAccounts, overridesMap }) => {
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
          amount: isPending ? -txn.originalAmount : -txn.chargedAmount,
          memo: isPending ? ['max-pending', foreignNote].filter(Boolean).join(' · ') : foreignNote,
        },
        isAdiCard,
        overridesMap,
      );
      if (!payload) continue;

      if (isPending) {
        pending.push({ ...payload, maxCategory: txn.category, cleared: 'uncleared', approved: true, flag_color: null });
      } else {
        completed.push({ ...payload, maxCategory: txn.category, cleared: 'cleared', approved: true, import_id: `max:${txn.identifier}` });
      }
    }

    cards.push({ accountNumber: card.accountNumber, accountId, completed, pending, pendingSuperseded });
  }

  return cards;
};
