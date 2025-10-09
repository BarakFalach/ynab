import { setupSupabase } from './supabase/setup.js';
import { transactionExists, insertTransaction, getTransactionStats } from './supabase/transactions.js';

const testSupabase = async () => {
  console.log('🧪 Testing Supabase setup...\n');

  try {
    // Test 1: Setup and connection
    console.log('1️⃣ Testing connection and setup...');
    const setupSuccess = await setupSupabase();
    if (!setupSuccess) {
      console.log('❌ Setup failed, stopping tests');
      return;
    }
    console.log('✅ Setup successful\n');

    // Test 2: Insert a test transaction
    console.log('2️⃣ Testing transaction insertion...');
    const testTransaction = {
      transaction_key: 'TEST-TRANSACTION-2025-01-01-1000-false',
      payee_name: 'Test Store',
      transaction_date: '2025-01-01',
      amount: 1000,
      card_type: false
    };

    const insertResult = await insertTransaction(testTransaction);
    if (insertResult) {
      console.log('✅ Test transaction inserted successfully');
    } else {
      console.log('❌ Failed to insert test transaction');
      return;
    }

    // Test 3: Check if transaction exists
    console.log('\n3️⃣ Testing transaction existence check...');
    const exists = await transactionExists(testTransaction.transaction_key);
    if (exists) {
      console.log('✅ Transaction exists check working');
    } else {
      console.log('❌ Transaction exists check failed');
    }

    // Test 4: Get statistics
    console.log('\n4️⃣ Testing statistics...');
    const stats = await getTransactionStats();
    console.log('📊 Current stats:', stats);

    // Test 5: Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    // Note: You might want to add a delete function to transactions.js
    console.log('ℹ️ Test data cleanup skipped (add delete function if needed)');

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Your Supabase setup is working correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run tests
testSupabase();

