/**
 * Comprehensive Migration Script: Fix All Installment Transactions
 * 
 * This script fixes existing installment transactions to ensure:
 * 1. Each installment has the correct divided amount (not total amount)
 * 2. Each installment has total_amount field populated
 * 3. Each installment has last_installment_date field populated
 * 4. Each installment has correct installment_number
 * 5. Each installment has correct monthly dates
 * 6. Descriptions include proper installment notation
 */

// Load environment variables first
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Parse local date helper (avoid timezone issues)
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  // Parse YYYY-MM-DD format without timezone conversion
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date to YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
  console.error('   You can set them in a .env file or as environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculate installment dates from a start date
 */
const calculateInstallmentDates = (startDate, count) => {
  const dates = [];
  const date = parseLocalDate(startDate);
  for (let i = 0; i < count; i++) {
    const installmentDate = new Date(date);
    installmentDate.setMonth(date.getMonth() + i);
    dates.push(formatDate(installmentDate));
  }
  return dates;
};

/**
 * Identify and group installment transactions
 */
const identifyInstallmentGroups = async (userId = null) => {
  console.log('🔍 Identifying installment transaction groups...\n');
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('is_installment', true)
    .order('created_at', { ascending: true });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: installments, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching installments:', error);
    return [];
  }
  
  console.log(`📊 Found ${installments.length} total installment transactions\n`);
  
  // Group installments by description pattern and user
  const groups = {};
  
  for (const transaction of installments) {
    // Extract base description (remove installment notation like "(1/12)")
    const baseDesc = transaction.description.replace(/\s*\(\d+\/\d+\)\s*$/g, '').trim();
    const groupKey = `${transaction.user_id}|${baseDesc}|${transaction.category}|${transaction.payment_method}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        baseDescription: baseDesc,
        user_id: transaction.user_id,
        category: transaction.category,
        payment_method: transaction.payment_method,
        transactions: []
      };
    }
    groups[groupKey].transactions.push(transaction);
  }
  
  return Object.values(groups);
};

/**
 * Fix a group of installment transactions
 */
const fixInstallmentGroup = async (group, dryRun = true) => {
  const transactions = group.transactions.sort((a, b) => {
    const dateA = parseLocalDate(a.date);
    const dateB = parseLocalDate(b.date);
    return dateA - dateB;
  });
  
  const count = transactions.length;
  const installmentCount = transactions[0].installment_count || count;
  
  // Calculate total amount from all transactions
  const totalFromAmounts = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  // Determine the correct total amount
  // If amounts are all the same and large, it's likely the total amount (needs fixing)
  const amounts = transactions.map(t => parseFloat(t.amount));
  const allSameAmount = amounts.every(a => Math.abs(a - amounts[0]) < 0.01);
  
  let totalAmount;
  let needsAmountFix = false;
  
  if (allSameAmount && count > 1) {
    // All amounts are the same - check if it's the total or installment amount
    const firstAmount = amounts[0];
    const possibleTotal = firstAmount * count;
    const possibleInstallment = firstAmount / count;
    
    // If the amount is relatively large and divisible by count, it's likely the total
    if (firstAmount > 100 && Math.abs(possibleInstallment - Math.round(possibleInstallment * 100) / 100) < 0.01) {
      totalAmount = firstAmount * count;
      needsAmountFix = true;
    } else {
      totalAmount = totalFromAmounts;
      needsAmountFix = false;
    }
  } else {
    totalAmount = totalFromAmounts;
    needsAmountFix = false;
  }
  
  const correctInstallmentAmount = totalAmount / installmentCount;
  
  // Calculate dates
  const startDate = formatDate(parseLocalDate(transactions[0].date));
  const dates = calculateInstallmentDates(startDate, installmentCount);
  const lastInstallmentDate = dates[dates.length - 1];
  
  // Check what needs fixing
  const issues = [];
  if (needsAmountFix) issues.push('Amount not properly divided');
  if (!transactions[0].total_amount) issues.push('Missing total_amount field');
  if (!transactions[0].last_installment_date) issues.push('Missing last_installment_date field');
  if (transactions.some(t => !t.installment_number)) issues.push('Missing installment_number');
  
  if (issues.length === 0 && transactions[0].total_amount && transactions[0].last_installment_date) {
    return { updated: 0, skipped: true };
  }
  
  console.log('================================================================================');
  console.log(`📝 ${dryRun ? '[DRY RUN]' : '[EXECUTING]'} Fixing: ${group.baseDescription}`);
  console.log(`   User ID: ${group.user_id.substring(0, 8)}...`);
  console.log(`   Total Amount: R$ ${totalAmount.toFixed(2)}`);
  console.log(`   Installments: ${installmentCount}`);
  console.log(`   Installment Amount: R$ ${correctInstallmentAmount.toFixed(2)}`);
  console.log(`   Last Installment Date: ${lastInstallmentDate}`);
  if (issues.length > 0) {
    console.log(`   Issues: ${issues.join(', ')}`);
  }
  console.log('');
  
  if (dryRun) {
    console.log('   Corrections to apply:');
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const changes = [];
      
      if (needsAmountFix) {
        changes.push(`Amount: R$ ${t.amount.toFixed(2)} → R$ ${correctInstallmentAmount.toFixed(2)}`);
      }
      if (!t.total_amount) {
        changes.push(`Add total_amount: R$ ${totalAmount.toFixed(2)}`);
      }
      if (!t.last_installment_date) {
        changes.push(`Add last_installment_date: ${lastInstallmentDate}`);
      }
      if (!t.installment_number) {
        changes.push(`Add installment_number: ${i + 1}`);
      }
      if (t.date !== dates[i]) {
        changes.push(`Date: ${t.date} → ${dates[i]}`);
      }
      
      if (changes.length > 0) {
        console.log(`   Transaction ${i + 1}/${installmentCount}:`);
        changes.forEach(change => console.log(`     - ${change}`));
      }
    }
    console.log(`\n   ℹ️  DRY RUN: Would update ${transactions.length} transactions`);
  } else {
    console.log(`   🔄 Updating ${transactions.length} transactions...`);
    
    let updated = 0;
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const updateData = {
        amount: correctInstallmentAmount,
        total_amount: totalAmount,
        last_installment_date: lastInstallmentDate,
        installment_number: i + 1,
        installment_count: installmentCount,
        date: dates[i],
        description: `${group.baseDescription} (${i + 1}/${installmentCount})`
      };
      
      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', t.id);
      
      if (error) {
        console.error(`   ❌ Error updating transaction ${t.id}:`, error.message);
      } else {
        updated++;
      }
    }
    
    console.log(`   ✅ Updated ${updated} transactions successfully`);
  }
  console.log('================================================================================\n');
  
  return { updated: transactions.length };
};

/**
 * Main migration function
 */
const runMigration = async () => {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const userId = args.find(arg => arg.startsWith('--user='))?.split('=')[1];
  const limitStr = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const limit = limitStr ? parseInt(limitStr) : null;
  
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE INSTALLMENT TRANSACTIONS MIGRATION               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode - no changes will be made\n');
  } else {
    console.log('⚠️  Running in EXECUTE mode - changes WILL be made to the database\n');
  }
  
  const groups = await identifyInstallmentGroups(userId);
  
  if (groups.length === 0) {
    console.log('✅ No installment transactions found or all are already correct!\n');
    return;
  }
  
  console.log(`📋 Found ${groups.length} installment groups\n`);
  
  let totalUpdated = 0;
  let groupsProcessed = 0;
  
  for (const group of groups) {
    if (limit && groupsProcessed >= limit) {
      console.log(`\n⚠️  Reached limit of ${limit} groups\n`);
      break;
    }
    
    const result = await fixInstallmentGroup(group, dryRun);
    if (!result.skipped) {
      totalUpdated += result.updated;
      groupsProcessed++;
    }
  }
  
  console.log('\n📊 MIGRATION SUMMARY:');
  console.log(`   - Groups processed: ${groupsProcessed}`);
  console.log(`   - Transactions ${dryRun ? 'that would be updated' : 'updated'}: ${totalUpdated}\n`);
  
  if (dryRun) {
    console.log('💡 Run with --execute to apply changes');
    console.log('   Example: node migrations/fix-existing-installments-comprehensive.js --execute\n');
  }
};

// Run migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
