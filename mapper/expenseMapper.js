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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const mapCardExpenseToYnabExpense = async (
  {date,
  payee_name,
  cardCategory,
  amount,
  memo}, isAdiCard, overridesMap = null
) => {
  try {
    const account_id = isAdiCard ? process.env.ADI_CARD : process.env.BARAK_CARD;
    
    // Validate account_id is a valid UUID
    if (!account_id) {
      const cardName = isAdiCard ? 'ADI_CARD' : 'BARAK_CARD';
      console.error(`❌ Error: ${cardName} environment variable is not set`);
      return null;
    }
    
    if (!UUID_REGEX.test(account_id)) {
      const cardName = isAdiCard ? 'ADI_CARD' : 'BARAK_CARD';
      console.error(`❌ Error: ${cardName} environment variable is not a valid UUID: ${account_id}`);
      return null;
    }
    
    const ynabDate = formatDateForYNAB(date);

    // Skip expenses with invalid dates
    if (!ynabDate) {
      console.warn(`⚠️ Skipping expense with invalid date: ${date} for payee: ${payee_name}`);
      return null;
    }

    const nameWithOutSlash = payee_name?.replace(/[\\/]/g, '') ?? '';

    // Category precedence: payee override > CategoriesMapper.json (by card category) > null.
    // The override map is keyed on the normalized payee name (nameWithOutSlash), which
    // is the exact string uploaded to YNAB, so the UI-selected payee matches here.
    const categoriesMapper = readJSONFile('./mapper/CategoriesMapper.json');
    const defaultCategoryId =
      categoriesMapper.find((category) => category.CardName === cardCategory)?.id ?? null;
    const overrideCategoryId =
      overridesMap && nameWithOutSlash ? overridesMap.get(nameWithOutSlash) : undefined;
    const category_id = overrideCategoryId ?? defaultCategoryId;


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
    console.error('Error mapping expense:', error);
    return null;
  }
};
