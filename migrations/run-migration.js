#!/usr/bin/env node

/**
 * Migration Runner - Wrapper script for installment transaction migration
 */

const path = require('path');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║     FinanceAI Pro - Installment Transaction Migration             ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found');
  console.error('');
  console.error('Please create a .env file with your Supabase credentials:');
  console.error('');
  console.error('  REACT_APP_SUPABASE_URL=your_supabase_url');
  console.error('  REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('');
  console.error('You can copy .env.example and fill in your credentials.');
  console.error('');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Check if credentials are set
if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase credentials not found in .env file');
  console.error('');
  console.error('Please set the following variables in your .env file:');
  console.error('');
  console.error('  REACT_APP_SUPABASE_URL=your_supabase_url');
  console.error('  REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('');
  process.exit(1);
}

console.log('✅ Environment configured\n');

// Run the migration
const migrationScript = path.join(__dirname, 'fix-installment-transactions.js');
require(migrationScript);
