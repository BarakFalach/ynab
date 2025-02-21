import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { mapCardExpenseToYnabExpense } from './expenseMapper.js';
import { validateExpenses } from '../ynabApi/validator.js';
import { uploadExpenses } from '../ynabApi/api.js';
import { handleDuplicate } from '../ynabApi/transactions.js';
import dotenv from 'dotenv';  // Use import if using ES Modules

dotenv.config();

console.log('Mapping expenses...', process.argv[2]);


const isAdiCard = process.argv[2] === 'adi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.resolve(
  __dirname,
  isAdiCard ? '../downloads/expenses2.xlsx' : '../downloads/expenses1.xlsx'
);

const DESIRED_COLUMNS = [
  'תאריך עסקה',
  'שם בית העסק',
  'קטגוריה',
  'סכום חיוב',
  'סכום עסקה מקורי'
];

const extractRowData = (headers, row) => {
  return DESIRED_COLUMNS.reduce((data, column) => {
    const index = headers.indexOf(column);
    if (index !== -1) data[column] = row[index];
    return data;
  }, {});
};

const processSheet = async (worksheet) => {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    range: 3,
    header: 1,
    defval: null,
    blankrows: true // Include all rows, even completely blank ones
  });

  const headers = jsonData[0];
  const expenses = [];

  for (const row of jsonData.slice(1)) {
    const rowData = extractRowData(headers, row);

    const { 'תאריך עסקה': date, 'שם בית העסק': payee, 'קטגוריה': category, 'סכום חיוב': amount, 'סכום עסקה מקורי': notFinalAmount } = rowData;
    const expense = await mapCardExpenseToYnabExpense(date, payee, category,amount ?? notFinalAmount, notFinalAmount);
    if (expense) expenses.push(expense);
  }

  return expenses;
};

export const mapExpenses = async () => {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    let allExpenses = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetExpenses = await processSheet(worksheet);
      allExpenses = allExpenses.concat(sheetExpenses);
    }

    if (allExpenses.length) {
      const validatedExpenses = validateExpenses(allExpenses);
      const uniqueExpenses = handleDuplicate(validatedExpenses);
      await uploadExpenses(uniqueExpenses);
      console.log('Expenses uploaded successfully.');
    } else {
      console.log('No expenses to upload.');
    }
  } catch (error) {
    console.error('Error processing expenses:', error);
  }
};

mapExpenses();