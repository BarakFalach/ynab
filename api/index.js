import express from 'express';
import { mapExpenses } from '../mapper/mapper.js';
import { downloadExpenses } from '../scraping/getCardData.js';
import { getTransactionStats, getAllTransactions, searchTransactions } from '../supabase/transactions.js';
import { upload, processUploadedFiles } from './fileProcessor.js';
// Removed pg import - now using Supabase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Simple file-based logging
const LOG_FILE = path.join(__dirname, '../logs/app.log');
const MAX_LOG_SIZE = 100; // Keep last 100 entries

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logging utility
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, type, message };
  
  try {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      logs = content ? JSON.parse(content) : [];
    }
    
    logs.unshift(logEntry);
    logs = logs.slice(0, MAX_LOG_SIZE);
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};

// Database initialization using Supabase
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing Supabase database...');
    console.log('🔧 SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('🔧 SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }
    
    // Import the Supabase initialization function
    const { initializeDatabase: initSupabase } = await import('../supabase/transactions.js');
    const success = await initSupabase();
    
    if (!success) {
      throw new Error('Failed to initialize Supabase database');
    }
    
    console.log('✅ Supabase database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('❌ Error details:', error.message);
    throw error;
  }
};

// Status tracking
let lastRunStatus = null;

// Main script execution
const runScript = async () => {
  log('🚀 Starting YNAB automation script', 'info');
  lastRunStatus = { status: 'running', startTime: new Date().toISOString() };
  
  try {
    // Initialize database first
    await initializeDatabase();
    // Download and process Barak's card
    log('📥 Downloading expenses for Barak', 'info');
    await downloadExpenses(false);
    log('✅ Barak expenses downloaded', 'success');
    
    log('🔄 Processing Barak expenses', 'info');
    await mapExpenses(false);
    log('✅ Barak expenses processed and uploaded', 'success');
    
    // Download and process Adi's card
    log('📥 Downloading expenses for Adi', 'info');
    await downloadExpenses(true);
    log('✅ Adi expenses downloaded', 'success');
    
    log('🔄 Processing Adi expenses', 'info');
    await mapExpenses(true);
    log('✅ Adi expenses processed and uploaded', 'success');
    
    lastRunStatus = { 
      status: 'success', 
      startTime: lastRunStatus.startTime,
      endTime: new Date().toISOString(),
      message: 'All expenses processed successfully'
    };
    log('🎉 Script completed successfully', 'success');
    
  } catch (error) {
    lastRunStatus = { 
      status: 'error', 
      startTime: lastRunStatus.startTime,
      endTime: new Date().toISOString(),
      error: error.message
    };
    log(`❌ Script failed: ${error.message}`, 'error');
    throw error;
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'YNAB Automation API',
    status: 'running',
    endpoints: {
      run: '/run-script',
      status: '/status',
      logs: '/logs',
      health: '/health',
      dashboard: '/dashboard',
      processFiles: '/process-files'
    }
  });
});

app.get('/run-script', async (req, res) => {
  try {
    await runScript();
    res.json({
      success: true,
      message: 'Script completed successfully',
      status: lastRunStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Script failed',
      error: error.message,
      status: lastRunStatus
    });
  }
});

// File upload endpoint
app.post('/process-files', upload.fields([
  { name: 'barakFile', maxCount: 1 },
  { name: 'adiFile', maxCount: 1 }
]), async (req, res) => {
  try {
    log('📁 Processing uploaded files', 'info');
    await processUploadedFiles(req, res);
  } catch (error) {
    log(`❌ File processing error: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      message: 'File processing failed',
      error: error.message
    });
  }
});

app.get('/status', (req, res) => {
  res.json({
    lastRun: lastRunStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    let logs = [];
    
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      logs = content ? JSON.parse(content) : [];
    }
    
    res.json({
      logs: logs.slice(0, limit),
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Get transaction statistics
app.get('/stats', async (req, res) => {
  try {
    const stats = await getTransactionStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all transactions with pagination
app.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await getAllTransactions(page, limit);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search transactions
app.get('/transactions/search', async (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const result = await searchTransactions(query, page, limit);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server with database initialization
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize database on startup
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      log(`Server started on port ${PORT}`, 'info');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;