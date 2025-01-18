import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { mapCardExpenseToYnabExpense } from './expenseMapper.js'
import { validateExpenses } from '../ynabApi/validator.js';
import { uploadExpenses } from '../ynabApi/api.js';
import { handleDuplicate } from '../ynabApi/transactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mapExpenses = async () => {
  // Load the workbook
  const workbook = XLSX.readFile(
    path.resolve(
      __dirname,
      '../downloads/transaction-details_export_1737045037965.xlsx'
    )
  );

  // Define the desired columns
  const desiredColumns = [
    'תאריך עסקה',
    'שם בית העסק',
    'קטגוריה',
    'סכום חיוב',
    'סכום עסקה מקורי',
  ];

  const expenses = []; // Array to hold all expenses

  // Iterate through all sheets (using for...of for async/await)
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    // Convert the sheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: 3, // Starts from row 4
      header: 1, // Output as arrays instead of objects
      defval: '', // Default value for empty cells
    });

    const headers = jsonData[0];

    // Iterate through each row (excluding the header)
    for (const row of jsonData.slice(1)) {
      const rowData = {};

      const dateColumnIndex = headers.indexOf('שם בית העסק');
      if (!row[dateColumnIndex]) continue;

      // Map desired columns
      for (const column of desiredColumns) {
        const columnIndex = headers.indexOf(column);
        if (columnIndex !== -1) {
          rowData[column] = row[columnIndex];
        }
      }

      // Extract data for mapping
      const date = rowData['תאריך עסקה'];
      const payee_name = rowData['שם בית העסק'];
      const cardCategory = rowData['קטגוריה'];
      const amount = rowData['סכום חיוב'];
      const memo = rowData['סכום עסקה מקורי'];

      // Map and collect the expense
      const expense = await mapCardExpenseToYnabExpense(
        date,
        payee_name,
        cardCategory,
        amount,
        memo
      );
      if (expense) expenses.push(expense);
    }
  }

  if (expenses.length > 0) {
    const valid = validateExpenses(expenses);
    const uniqueExpenses = handleDuplicate(valid);
    uploadExpenses(uniqueExpenses)
  } else {
    console.log('No expenses to upload.');
  }
};
