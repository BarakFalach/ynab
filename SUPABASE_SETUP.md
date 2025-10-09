# Supabase Migration Guide

This guide will help you migrate from PostgreSQL to Supabase.

## Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following values:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)

## Step 2: Set Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Remove or comment out the old PostgreSQL variables
# DATABASE_URL=your_old_postgresql_url
```

## Step 3: Create Database Table

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this SQL to create the table:

```sql
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
```

## Step 4: Test the Setup

Run the setup script to verify everything is working:

```bash
node supabase/setup.js
```

## Step 5: Update Your Code

The following files have been updated to use Supabase:

- `api/index.js` - Updated to use Supabase initialization
- `mapper/mapper.js` - Updated to use Supabase transactions
- `supabase/transactions.js` - New Supabase database operations
- `supabase/supabaseConfig.js` - Supabase client configuration

## Step 6: Test Your Application

1. Start your application: `npm run server`
2. Test the endpoints to ensure they work with Supabase
3. Check the Supabase dashboard to see data being inserted

## Troubleshooting

### Connection Issues
- Verify your SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check that your Supabase project is active

### Table Issues
- Ensure the table was created successfully in Supabase
- Check the table name matches exactly: `transaction_logs`

### Permission Issues
- Make sure your anon key has the correct permissions
- Check Row Level Security (RLS) policies if enabled

## Benefits of Supabase

- **Real-time subscriptions** - Get live updates
- **Built-in authentication** - Easy user management
- **Auto-generated APIs** - REST and GraphQL APIs
- **Dashboard** - Visual database management
- **Edge functions** - Serverless functions
- **Storage** - File storage capabilities

## Next Steps

Once migration is complete, you can:
1. Remove the old PostgreSQL dependencies
2. Set up Row Level Security policies
3. Add real-time subscriptions if needed
4. Explore other Supabase features


