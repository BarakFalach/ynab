import axios from 'axios';
import { chunkArray } from '../utils/chunkUtils.js';

const YNAB_API_URL = 'https://api.youneedabudget.com/v1';

export const uploadExpenses = async (expenses) => {
  const budgetId = process.env.BUDGET_ID;
  const accessToken = process.env.YNAB_ACCESS_TOKEN;

  if (expenses.length === 0) {
    console.log('No expenses to upload. after duplicate check');
    return;
  }

  const chunkedExpenses = chunkArray(expenses, 50);
  for (const chunk of chunkedExpenses) {
    try {
      console.log('Uploading chunk:');
      const response = await axios.post(
        `${YNAB_API_URL}/budgets/${budgetId}/transactions`,
        { transactions: chunk },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log('Bulk upload successful:', response.data);
    } catch (error) {
      console.error('ERROR', error.data.error);
    }
  }
};
