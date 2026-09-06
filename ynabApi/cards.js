import axios from 'axios';
import { chunkArray } from '../utils/chunkUtils.js';

const YNAB_API_URL = 'https://api.ynab.com/v1';

const ynab = () =>
  axios.create({
    baseURL: `${YNAB_API_URL}/budgets/${process.env.BUDGET_ID}`,
    headers: { Authorization: `Bearer ${process.env.YNAB_ACCESS_TOKEN}` },
  });

export const fetchCategoryNames = async () => {
  const { data } = await ynab().get('/categories');
  return new Map(data.data.category_groups.flatMap((group) => group.categories.map((c) => [c.id, c.name])));
};

export const fetchCardTransactionsSince = async (accountId, date) => {
  const { data } = await ynab().get(`/accounts/${accountId}/transactions`, { params: { since_date: date } });
  return data.data.transactions;
};

export const uploadCardTransactions = async (transactions) => {
  let created = 0;
  let duplicateImportIds = 0;
  for (const chunk of chunkArray(transactions, 50)) {
    const { data } = await ynab().post('/transactions', { transactions: chunk });
    created += data.data.transaction_ids?.length ?? 0;
    duplicateImportIds += data.data.duplicate_import_ids?.length ?? 0;
  }
  return { created, duplicateImportIds };
};

export const clearCardTransactions = async (ids) => {
  let updated = 0;
  for (const chunk of chunkArray(ids, 50)) {
    const { data } = await ynab().patch('/transactions', { transactions: chunk.map((id) => ({ id, cleared: 'cleared' })) });
    updated += data.data.transaction_ids?.length ?? 0;
  }
  return updated;
};

export const deleteCardTransaction = async (id) => {
  await ynab().delete(`/transactions/${id}`);
};
