import { readJSONFile, writeJSONFile } from '../utils/fileUtils.js';

export const handleDuplicate = (expenses) => {
  let transactionLog = readJSONFile('transactionLog.json');

  const uniqueTransactions = expenses.filter((transaction) => {
    const key = `${transaction.payee_name}-${transaction.date}-${transaction.amount}`;
    if (transactionLog[key]) {
      console.log(`Duplicate found: ${key}`);
      return false;
    } else {
      transactionLog[key] = true;
      return true;
    }
  });

  writeJSONFile('transactionLog.json', transactionLog);
  return uniqueTransactions;
};
