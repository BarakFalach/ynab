import axios from 'axios';
import { chunkArray } from '../utils/chunkUtils.js';

const YNAB_API_URL = 'https://api.youneedabudget.com/v1';

export const uploadExpenses = async (expenses) => {
  const budgetId = process.env.BUDGET_ID;
  const accessToken = process.env.YNAB_ACCESS_TOKEN;

  if (expenses.length === 0) {
    console.log('📭 No expenses to upload');
    return { success: true, uploaded: 0, total: 0 };
  }

  const chunkedExpenses = chunkArray(expenses, 50);
  let allSuccess = true;
  let totalUploaded = 0;

  for (const chunk of chunkedExpenses) {
    try {
      console.log('Uploading chunk:');
      const response = await axios.post(
        `${YNAB_API_URL}/budgets/${budgetId}/transactions`,
        { transactions: chunk },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log('Bulk upload successful:', response.data);
      totalUploaded += chunk.length;
    } catch (error) {
      console.error('ERROR', error.response?.data?.error || error.message);
      allSuccess = false;
      // Continue with next chunk even if one fails
    }
  }

  return { 
    success: allSuccess, 
    uploaded: totalUploaded,
    total: expenses.length 
  };
};
