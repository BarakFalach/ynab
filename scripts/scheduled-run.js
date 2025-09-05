#!/usr/bin/env node

/**
 * Scheduled YNAB Sync Script
 * This script is designed to run in scheduled environments (GitHub Actions, Railway Cron, etc.)
 * It includes better error handling and logging for automated runs.
 */

import { mapExpenses } from '../mapper/mapper.js';
import { downloadExpenses } from '../scraping/getCardData.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enhanced logging for scheduled runs
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

// Validate required environment variables
const validateEnvironment = () => {
  const required = [
    'CREDIT_CARD_USERNAME',
    'CREDIT_CARD_PASSWORD', 
    'YNAB_ACCESS_TOKEN',
    'BUDGET_ID',
    'BARAK_CARD',
    'ADI_CARD'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  log('Environment validation passed', 'success');
};

// Main execution function
const main = async () => {
  const startTime = Date.now();
  log('🚀 Starting scheduled YNAB sync', 'info');
  
  try {
    // Validate environment
    validateEnvironment();
    
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
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`🎉 Scheduled sync completed successfully in ${duration}s`, 'success');
    
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`❌ Scheduled sync failed after ${duration}s: ${error.message}`, 'error');
    console.error('Full error details:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run the script
main();
