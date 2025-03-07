import { readJSONFile } from '../utils/fileUtils.js';
import { formatDateForYNAB } from '../utils/dateUtils.js';

// Example YNAB API Transaction Object format:
// {
//   account_id: 'string',
//   date: 'YYYY-MM-DD',
//   amount: number,  // in minor units, e.g., cents
//   payee_name: 'string',
//   category_id: 'string', // optional
//   memo: 'string' // optional
// }

export const mapCardExpenseToYnabExpense = async (
  {date,
  payee_name,
  cardCategory,
  amount,
  memo}, isAdiCard
) => {
  try {
    const account_id = isAdiCard ? process.env.ADI_CARD  :  process.env.BARAK_CARD;
    const categoriesMapper = readJSONFile('./mapper/CategoriesMapper.json');
    const category_id =
      categoriesMapper.find((category) => category.CardName === cardCategory)?.id ?? null;
    const ynabDate = formatDateForYNAB(date);
  
    const nameWithOutSlash = payee_name.replace(/[\\/]/g, '');


    return {
      account_id,
      date: ynabDate,
      payee_name: nameWithOutSlash,
      category_id,
      amount: Math.round(amount * -1000),
      memo,
      cleared: 'uncleared',
    };
  } catch (error) {
    console.log('Error mapping card expense to YNAB expense:', error);
  }
};
