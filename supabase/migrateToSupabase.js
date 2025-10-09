import { supabase } from './supabaseConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the transaction_logs table in Supabase
export const createTransactionLogsTable = async () => {
  try {
    console.log('🔧 Creating transaction_logs table in Supabase...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS transaction_logs (
          id SERIAL PRIMARY KEY,
          transaction_key VARCHAR(500) UNIQUE NOT NULL,
          payee_name VARCHAR(255) NOT NULL,
          transaction_date DATE NOT NULL,
          amount INTEGER NOT NULL,
          card_type BOOLEAN NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_transaction_key 
        ON transaction_logs(transaction_key);
      `
    });

    if (error) {
      console.error('❌ Error creating table:', error);
      throw error;
    }

    console.log('✅ transaction_logs table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to create table:', error);
    return false;
  }
};

// Alternative method using direct SQL execution
export const createTransactionLogsTableDirect = async () => {
  try {
    console.log('🔧 Creating transaction_logs table using direct SQL...');
    
    // First, let's try to create the table using a simple query
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, we need to create it
      console.log('📝 Table does not exist, you need to create it manually in Supabase dashboard');
      console.log('📝 Please run this SQL in your Supabase SQL editor:');
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
      console.error('❌ Error checking table:', error);
      return false;
    } else {
      console.log('✅ transaction_logs table already exists');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to check/create table:', error);
    return false;
  }
};

// Skip data migration - user doesn't want to migrate existing data
export const skipDataMigration = () => {
  console.log('⏭️ Skipping data migration as requested');
  return true;
};

// Test Supabase connection
export const testConnection = async () => {
  try {
    console.log('🔌 Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
};

// Main migration function
export const migrateToSupabase = async () => {
  console.log('🚀 Starting migration to Supabase...');
  
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.log('❌ Cannot proceed without database connection');
      return false;
    }

    // Create table
    const tableCreated = await createTransactionLogsTableDirect();
    if (!tableCreated) {
      console.log('❌ Cannot proceed without table');
      return false;
    }

    // Skip data migration
    const dataMigrated = skipDataMigration();
    if (!dataMigrated) {
      console.log('❌ Data migration step failed');
      return false;
    }

    console.log('🎉 Migration to Supabase completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToSupabase();
}
