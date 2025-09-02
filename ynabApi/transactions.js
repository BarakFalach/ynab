import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database table
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_logs (
        id SERIAL PRIMARY KEY,
        transaction_key VARCHAR(500) UNIQUE NOT NULL,
        payee_name VARCHAR(255) NOT NULL,
        transaction_date DATE NOT NULL,
        amount INTEGER NOT NULL,
        card_type BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_key 
      ON transaction_logs(transaction_key)
    `);
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Check if transaction exists
async function transactionExists(transactionKey) {
  try {
    const result = await pool.query(
      'SELECT id FROM transaction_logs WHERE transaction_key = $1',
      [transactionKey]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Error checking transaction:', error);
    return false;
  }
}

// Add transaction to log
async function addTransaction(transactionKey, payeeName, date, amount, cardType) {
  try {
    await pool.query(`
      INSERT INTO transaction_logs (transaction_key, payee_name, transaction_date, amount, card_type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (transaction_key) DO NOTHING
    `, [transactionKey, payeeName, date, amount, cardType]);
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    throw error;
  }
}

export const handleDuplicate = async (expenses, isAdiCard) => {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Filter unique transactions
    const uniqueTransactions = [];
    
    for (const expense of expenses) {
      const transactionKey = `${expense.payee_name}-${expense.date}-${expense.amount}-${isAdiCard}`;
      
      // Check if transaction already exists
      const exists = await transactionExists(transactionKey);
      
      if (!exists) {
        uniqueTransactions.push(expense);
        
        // Add to database
        await addTransaction(
          transactionKey,
          expense.payee_name,
          expense.date,
          expense.amount,
          isAdiCard
        );
      }
    }
    
    console.log(`📊 Found ${uniqueTransactions.length} new transactions out of ${expenses.length} total`);
    return uniqueTransactions;
    
  } catch (error) {
    console.error('❌ Error handling duplicates:', error);
    // Fallback to original expenses if database fails
    return expenses;
  }
};

// Get transaction statistics
export const getTransactionStats = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        card_type,
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        MIN(created_at) as first_transaction,
        MAX(created_at) as last_transaction
      FROM transaction_logs 
      GROUP BY card_type
    `);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    return [];
  }
};
