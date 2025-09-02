import express from 'express';
import { mapExpenses } from '../mapper/mapper.js';
import { downloadExpenses } from '../scraping/getCardData.js';
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

// Status tracking
let lastRunStatus = null;

// Main script execution
const runScript = async () => {
  log('🚀 Starting YNAB automation script', 'info');
  lastRunStatus = { status: 'running', startTime: new Date().toISOString() };
  
  try {
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
      dashboard: '/dashboard'
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  log(`Server started on port ${PORT}`, 'info');
});

export default app;