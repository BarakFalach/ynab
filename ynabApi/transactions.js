import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection with smart configuration
const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // For Railway production, use SSL
  // For local development, disable SSL
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
  
  return {
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  };
};

const pool = new Pool(getDatabaseConfig());

// Initialize database table
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    console.log('🔧 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
    
    // Test connection first
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
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
    console.error('❌ Error details:', error.message);
    console.error('❌ Error code:', error.code);
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

// Get all transactions with pagination
export const getAllTransactions = async (page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
      SELECT 
        id,
        payee_name,
        transaction_date,
        amount,
        card_type,
        created_at
      FROM transaction_logs 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM transaction_logs');
    const total = parseInt(countResult.rows[0].count);
    
    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting transactions:', error);
    return { transactions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
  }
};

// Search transactions
export const searchTransactions = async (query, page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
      SELECT 
        id,
        payee_name,
        transaction_date,
        amount,
        card_type,
        created_at
      FROM transaction_logs 
      WHERE payee_name ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${query}%`, limit, offset]);
    
    // Get total count for search
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM transaction_logs WHERE payee_name ILIKE $1',
      [`%${query}%`]
    );
    const total = parseInt(countResult.rows[0].count);
    
    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error searching transactions:', error);
    return { transactions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
  }
};