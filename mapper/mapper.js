import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { mapCardExpenseToYnabExpense } from './expenseMapper.js';
import { validateExpenses } from '../ynabApi/validator.js';
import { uploadExpenses } from '../ynabApi/api.js';
import { handleDuplicate, saveTransactionsAfterUpload } from '../supabase/transactions.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const processSheet = async (worksheet, isAdiCard) => {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    range: 3,
    header: 1,
    defval: null,
    blankrows: true
  });

  const headers = jsonData[0];
  const expenses = [];

  for (const row of jsonData.slice(1)) {
    const rowData = extractRowData(headers, row);
    const { 'תאריך עסקה': date, 'שם בית העסק': payee, 'קטגוריה': category, 'סכום חיוב': amount, 'סכום עסקה מקורי': notFinalAmount } = rowData;
    const expense = await mapCardExpenseToYnabExpense({
      date, payee_name: payee, cardCategory: category, amount :amount ?? notFinalAmount, memo: notFinalAmount}, isAdiCard);
    if (expense) expenses.push(expense);
  }

  return expenses;
};

export const mapExpenses = async (isAdiCard, skipDuplicateCheck = false) => {
  try {
    const FILE_PATH = path.resolve(__dirname, isAdiCard ? '../downloads/expenses2.xlsx' : '../downloads/expenses1.xlsx');
    const workbook = XLSX.readFile(FILE_PATH);
    let allExpenses = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetExpenses = await processSheet(worksheet, isAdiCard);
      allExpenses = allExpenses.concat(sheetExpenses);
    }

    if (allExpenses.length) {
      const validatedExpenses = validateExpenses(allExpenses);
      
      let expensesToUpload;
      if (skipDuplicateCheck) {
        console.log('⚠️ Skipping duplicate check - uploading all expenses');
        expensesToUpload = validatedExpenses;
      } else {
        expensesToUpload = await handleDuplicate(validatedExpenses, isAdiCard);
      }
      
      // Upload to YNAB first
      const uploadResult = await uploadExpenses(expensesToUpload);
      
      // Only save to database if upload was successful and duplicate check was not skipped
      if (!skipDuplicateCheck && uploadResult.success && uploadResult.uploaded > 0) {
        await saveTransactionsAfterUpload(expensesToUpload, isAdiCard);
        console.log('✅ Expenses uploaded successfully and saved to database.');
      } else if (skipDuplicateCheck) {
        console.log('✅ Expenses uploaded successfully (duplicate check and DB save skipped).');
      } else {
        console.log('⚠️ Expenses uploaded but some may have failed. Database not updated.');
      }
    } else {
      console.log('📭 No expenses to upload - after type check');
    }
  } catch (error) {
    console.error('Error processing expenses:', error);
  }
};