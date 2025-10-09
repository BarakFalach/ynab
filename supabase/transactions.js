import { supabase } from './supabaseConfig.js';

// Check if transaction exists
export const transactionExists = async (transactionKey) => {
  try {
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('id')
      .eq('transaction_key', transactionKey)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found
      return false;
    } else if (error) {
      console.error('❌ Error checking transaction existence:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('❌ Error checking transaction existence:', error);
    return false;
  }
};

// Insert transaction
export const insertTransaction = async (transactionData) => {
  try {
    console.log('🔍 Inserting transaction data:', JSON.stringify(transactionData, null, 2));
    
    const { data, error } = await supabase
      .from('transaction_logs')
      .insert([transactionData])
      .select();

    if (error) {
      console.error('❌ Error inserting transaction:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Transaction inserted successfully:', data[0]);
    return data[0];
  } catch (error) {
    console.error('❌ Error inserting transaction:', error);
    console.error('❌ Error stack:', error.stack);
    return false;
  }
};

// Upsert transaction (insert or update)
export const upsertTransaction = async (transactionData) => {
  try {
    const { data, error } = await supabase
      .from('transaction_logs')
      .upsert([transactionData], { onConflict: 'transaction_key' })
      .select();

    if (error) {
      console.error('❌ Error upserting transaction:', error);
      return false;
    }

    return data[0];
  } catch (error) {
    console.error('❌ Error upserting transaction:', error);
    return false;
  }
};

// Handle duplicate transactions
export const handleDuplicate = async (expenses, isAdiCard) => {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    console.log(`🔍 Checking for duplicates in ${expenses.length} expenses...`);
    
    const uniqueExpenses = [];
    let duplicateCount = 0;

    for (const expense of expenses) {
      const transactionKey = `${expense.payee_name}-${expense.date}-${expense.amount}-${isAdiCard}`;
      
      const exists = await transactionExists(transactionKey);
      if (!exists) {
        uniqueExpenses.push(expense);
        
        // Add to database to prevent future duplicates
        console.log(`💾 Adding transaction to database: ${transactionKey}`);
        const insertResult = await insertTransaction({
          transaction_key: transactionKey,
          payee_name: expense.payee_name,
          transaction_date: expense.date,
          amount: expense.amount,
          card_type: isAdiCard
        });
        
        if (!insertResult) {
          console.error(`❌ Failed to insert transaction: ${transactionKey}`);
        } else {
          console.log(`✅ Successfully inserted transaction: ${transactionKey}`);
        }
      } else {
        duplicateCount++;
        console.log(`⚠️ Duplicate found: ${expense.payee_name} - ${expense.date}`);
      }
    }

    console.log(`✅ Found ${duplicateCount} duplicates, ${uniqueExpenses.length} unique expenses`);
    return uniqueExpenses;
  } catch (error) {
    console.error('❌ Error handling duplicates:', error);
    return expenses; // Return original expenses if error
  }
};

// Get transaction statistics
export const getTransactionStats = async () => {
  try {
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('*');

    if (error) {
      console.error('❌ Error getting stats:', error);
      return [];
    }

    const stats = {
      total: data.length,
      barak: data.filter(t => !t.card_type).length,
      adi: data.filter(t => t.card_type).length,
      totalAmount: data.reduce((sum, t) => sum + t.amount, 0),
      barakAmount: data.filter(t => !t.card_type).reduce((sum, t) => sum + t.amount, 0),
      adiAmount: data.filter(t => t.card_type).reduce((sum, t) => sum + t.amount, 0)
    };

    return stats;
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    return [];
  }
};

// Get all transactions with pagination
export const getAllTransactions = async (page = 1, limit = 50) => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await supabase
      .from('transaction_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('❌ Error getting transactions:', error);
      return { transactions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }

    return {
      transactions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await supabase
      .from('transaction_logs')
      .select('*', { count: 'exact' })
      .or(`payee_name.ilike.%${query}%,transaction_key.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('❌ Error searching transactions:', error);
      return { transactions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }

    return {
      transactions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error searching transactions:', error);
    return { transactions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
  }
};

// Initialize database (create table if not exists)
export const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing Supabase database...');
    
    // Test connection
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('count')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('❌ Table does not exist. Please create it in Supabase dashboard.');
      console.log('📝 Run this SQL in your Supabase SQL Editor:');
      console.log(`
        CREATE TABLE transaction_logs (
          id SERIAL PRIMARY KEY,
          transaction_key VARCHAR(500) UNIQUE NOT NULL,
          payee_name VARCHAR(255) NOT NULL,
          transaction_date DATE NOT NULL,
          amount INTEGER NOT NULL,
          card_type BOOLEAN NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_transaction_key ON transaction_logs(transaction_key);
      `);
      return false;
    } else if (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }

    console.log('✅ Supabase database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

