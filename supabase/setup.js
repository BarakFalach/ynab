import { supabase } from './supabaseConfig.js';

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

// Check if table exists
export const checkTableExists = async () => {
  try {
    console.log('🔍 Checking if transaction_logs table exists...');
    
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('❌ Table does not exist');
      return false;
    } else if (error) {
      console.error('❌ Error checking table:', error);
      return false;
    } else {
      console.log('✅ transaction_logs table exists');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to check table:', error);
    return false;
  }
};

// Main setup function
export const setupSupabase = async () => {
  console.log('🚀 Setting up Supabase...');
  
  try {
    // Test connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.log('❌ Cannot connect to Supabase. Please check your environment variables.');
      console.log('📝 Make sure you have set:');
      console.log('   - SUPABASE_URL');
      console.log('   - SUPABASE_ANON_KEY');
      return false;
    }

    // Check if table exists
    const tableExists = await checkTableExists();
    if (!tableExists) {
      console.log('📝 Please create the transaction_logs table in your Supabase dashboard:');
      console.log('   1. Go to your Supabase project dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Run this SQL:');
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
    }

    console.log('🎉 Supabase setup completed successfully!');
    console.log('✅ You can now use Supabase as your database');
    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSupabase();
}


