const agorot = (amount) => Math.round(amount * 100);

export const mapBankTransactions = ({ bankTxns, cardAccounts, rules, ynabAccounts }) => {
  const bankAccountId = process.env.BANK_ACCOUNT;
  const cardYnabAccountIds = { 6312: process.env.BARAK_CARD, 7626: process.env.ADI_CARD };
  const transferPayeeIdOf = (accountId) => ynabAccounts.find((a) => a.id === accountId)?.transfer_payee_id;

  const transactions = [];
  const unmatched = [];

  for (const txn of bankTxns) {
    if (txn.status !== 'completed') continue;

    const base = {
      account_id: bankAccountId,
      date: txn.date,
      amount: Math.round(txn.chargedAmount * 1000),
      cleared: 'cleared',
      approved: true,
      import_id: `discount:${txn.identifier}`,
      memo: `${txn.description} (ref ${txn.identifier})`,
    };

    if (/^מקס איט פי/.test(txn.description)) {
      let matched = null;
      for (const card of cardAccounts) {
        const rows = card.txns.filter((r) => r.status === 'completed' && r.processedDate === txn.date);
        const sum = rows.reduce((total, r) => total + r.chargedAmount, 0);
        if (rows.length > 0 && agorot(sum) === agorot(txn.chargedAmount)) {
          matched = { card, rows };
          break;
        }
      }

      if (matched) {
        const detail = matched.rows.length > 3 ? 'Max bill' : matched.rows.map((r) => r.description).join(' + ');
        transactions.push({
          ...base,
          payee_id: transferPayeeIdOf(cardYnabAccountIds[matched.card.accountNumber]),
          memo: `${detail} (ref ${txn.identifier})`,
        });
      } else {
        transactions.push({ ...base, payee_name: 'Max', category_id: null, flag_color: 'yellow' });
        unmatched.push({ ...txn, reason: `no Max card has completed transactions charged on ${txn.date} summing to ${txn.chargedAmount}` });
      }
      continue;
    }

    const rule = rules.find(
      (r) => txn.description.includes(r.match_text) && (r.match_amount == null || agorot(Number(r.match_amount)) === agorot(txn.chargedAmount)),
    );

    if (!rule) {
      transactions.push({ ...base, payee_name: txn.description, category_id: null, flag_color: 'yellow' });
      unmatched.push({ ...txn, reason: 'no bank rule matches' });
      continue;
    }

    if (rule.transfer_account_id) {
      transactions.push({
        ...base,
        payee_name: rule.payee_name,
        payee_id: transferPayeeIdOf(rule.transfer_account_id),
        ...(rule.category_id ? { category_id: rule.category_id } : {}),
      });
      continue;
    }

    transactions.push({ ...base, payee_name: rule.payee_name, category_id: rule.category_id });
  }

  return { transactions, unmatched };
};
