import multer from 'multer';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { mapCardExpenseToYnabExpense } from '../mapper/expenseMapper.js';
import { validateExpenses } from '../ynabApi/validator.js';
import { uploadExpenses } from '../ynabApi/api.js';
import { handleDuplicate } from '../ynabApi/transactions.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

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
    
    if (date && payee && (amount || notFinalAmount)) {
      const expense = await mapCardExpenseToYnabExpense({
        date, 
        payee_name: payee, 
        cardCategory: category, 
        amount: amount ?? notFinalAmount, 
        memo: notFinalAmount
      }, isAdiCard);
      
      if (expense) expenses.push(expense);
    }
  }

  return expenses;
};

const processFile = async (filePath, isAdiCard) => {
  try {
    const workbook = XLSX.readFile(filePath);
    let allExpenses = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetExpenses = await processSheet(worksheet, isAdiCard);
      allExpenses = allExpenses.concat(sheetExpenses);
    }

    return allExpenses;
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
};

export const processUploadedFiles = async (req, res) => {
  try {
    console.log('📁 Processing uploaded files...');
    
    const results = {
      barak: { processed: 0, uploaded: 0 },
      adi: { processed: 0, uploaded: 0 }
    };

    // Process Barak's file if provided
    if (req.files && req.files.barakFile) {
      console.log('📄 Processing Barak\'s file:', req.files.barakFile[0].filename);
      
      const barakExpenses = await processFile(req.files.barakFile[0].path, false);
      results.barak.processed = barakExpenses.length;
      
      if (barakExpenses.length > 0) {
        const validatedExpenses = validateExpenses(barakExpenses);
        const uniqueExpenses = await handleDuplicate(validatedExpenses, false);
        await uploadExpenses(uniqueExpenses);
        results.barak.uploaded = uniqueExpenses.length;
        console.log(`✅ Barak: ${uniqueExpenses.length} expenses uploaded`);
      }
    }

    // Process Adi's file if provided
    if (req.files && req.files.adiFile) {
      console.log('📄 Processing Adi\'s file:', req.files.adiFile[0].filename);
      
      const adiExpenses = await processFile(req.files.adiFile[0].path, true);
      results.adi.processed = adiExpenses.length;
      
      if (adiExpenses.length > 0) {
        const validatedExpenses = validateExpenses(adiExpenses);
        const uniqueExpenses = await handleDuplicate(validatedExpenses, true);
        await uploadExpenses(uniqueExpenses);
        results.adi.uploaded = uniqueExpenses.length;
        console.log(`✅ Adi: ${uniqueExpenses.length} expenses uploaded`);
      }
    }

    // Clean up uploaded files
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log('🗑️ Cleaned up file:', file.filename);
          } catch (error) {
            console.error('Error cleaning up file:', error);
          }
        });
      });
    }

    const totalProcessed = results.barak.processed + results.adi.processed;
    const totalUploaded = results.barak.uploaded + results.adi.uploaded;

    res.json({
      success: true,
      message: `Successfully processed ${totalProcessed} expenses and uploaded ${totalUploaded} unique transactions`,
      results: results
    });

  } catch (error) {
    console.error('❌ Error processing files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process files',
      error: error.message
    });
  }
};
