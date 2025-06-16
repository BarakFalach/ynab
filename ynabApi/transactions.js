import fs from 'fs/promises';
import path from 'path';

// Path to local JSON file for transaction logs
const TRANSACTION_LOG_PATH = path.join(process.cwd(), 'data', 'transactionLog.json');

// Helper function to ensure the data directory exists and create the JSON file if it doesn't
async function ensureTransactionLogExists() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, which is fine
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Check if file exists, create if not
    try {
      await fs.access(TRANSACTION_LOG_PATH);
    } catch {
      // File doesn't exist, create it with empty object
      await fs.writeFile(TRANSACTION_LOG_PATH, JSON.stringify({}), 'utf8');
    }
  } catch (error) {
    console.error('Error ensuring transaction log exists:', error);
    throw error;
  }
}

// Function to read the transaction log
async function readTransactionLog() {
  await ensureTransactionLogExists();
  const data = await fs.readFile(TRANSACTION_LOG_PATH, 'utf8');
  return JSON.parse(data);
}

// Function to write to the transaction log
async function writeTransactionLog(data) {
  await fs.writeFile(TRANSACTION_LOG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export const handleDuplicate = async (expenses, isAdiCard) => {
  // Step 1: Generate all keys
  const keys = expenses.map((tx) => `${tx.payee_name}-${tx.date}-${tx.amount}-${isAdiCard}`);

  // Step 2: Load existing transaction log
  const transactionLog = await readTransactionLog();

  // Step 3: Filter unique transactions
  const uniqueTransactions = expenses.filter((tx) => {
    const key = `${tx.payee_name}-${tx.date}-${tx.amount}-${isAdiCard}`;
    return !transactionLog[key];
  });

  // Step 4: Update transaction log with new transactions
  if (uniqueTransactions.length > 0) {
    uniqueTransactions.forEach((tx) => {
      const key = `${tx.payee_name}-${tx.date}-${tx.amount}-${isAdiCard}`;
      transactionLog[key] = { exists: true };
    });
    
    // Write updated log back to file
    await writeTransactionLog(transactionLog);
  }

  return uniqueTransactions;
};
