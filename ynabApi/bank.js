import axios from 'axios';
import { chunkArray } from '../utils/chunkUtils.js';

const YNAB_API_URL = 'https://api.ynab.com/v1';

const ynab = () =>
  axios.create({
    baseURL: `${YNAB_API_URL}/budgets/${process.env.BUDGET_ID}`,
    headers: { Authorization: `Bearer ${process.env.YNAB_ACCESS_TOKEN}` },
  });

export const fetchYnabAccounts = async () => {
  const { data } = await ynab().get('/accounts');
  return data.data.accounts;
};

export const fetchYnabBankAccount = async () => {
  const { data } = await ynab().get(`/accounts/${process.env.BANK_ACCOUNT}`);
  return data.data.account;
};

export const fetchBankTransactionsSince = async (date) => {
  const { data } = await ynab().get(`/accounts/${process.env.BANK_ACCOUNT}/transactions`, { params: { since_date: date } });
  return data.data.transactions;
};

export const uploadBankTransactions = async (transactions) => {
  let created = 0;
  let duplicateImportIds = 0;
  for (const chunk of chunkArray(transactions, 50)) {
    const { data } = await ynab().post('/transactions', { transactions: chunk });
    created += data.data.transaction_ids?.length ?? 0;
    duplicateImportIds += data.data.duplicate_import_ids?.length ?? 0;
  }
  return { created, duplicateImportIds };
};
