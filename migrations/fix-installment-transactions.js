/**
 * Migration Script: Fix Old Installment Transactions
 * 
 * This script identifies and corrects installment transactions that were created
 * before the proper installment logic was implemented. It ensures that:
 * 
 * 1. Each installment has the correct amount (total / installment_count)
 * 2. Each installment has the correct date (monthly intervals)
 * 3. Each installment has the correct installment_number
 * 4. Description includes installment information (X/Y)
 * 
 * Problem Patterns to Fix:
 * - Installments with full amount instead of divided amount
 * - Installments with missing or incorrect installment_number
 * - Installments with same dates instead of monthly intervals
 * - Descriptions without installment notation
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
    const year = installmentDate.getFullYear();
    const month = String(installmentDate.getMonth() + 1).padStart(2, '0');
    const day = String(installmentDate.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

/**
 * Identify groups of installment transactions that need fixing
 */
const identifyProblematicInstallments = async (userId = null) => {
  console.log('🔍 Identifying problematic installment transactions...\n');
  
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
  const problematicGroups = [];
  
  for (const transaction of installments) {
    // Extract base description (remove installment notation like "(1/12)")
    const baseDesc = transaction.description.replace(/\s*\(\d+\/\d+\)\s*$/g, '').trim();
    const groupKey = `${transaction.user_id}|${baseDesc}|${transaction.category}|${transaction.payment_method}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(transaction);
  }
  
  // Analyze each group for problems
  for (const [key, transactions] of Object.entries(groups)) {
    const [userId, baseDesc] = key.split('|');
    
    if (transactions.length === 0) continue;
    
    const firstTx = transactions[0];
    const expectedCount = firstTx.installment_count;
    
    // Sort by date to check if they're in order
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const problems = [];
    
    // Check 1: Count mismatch
    if (transactions.length !== expectedCount) {
      problems.push(`Count mismatch: found ${transactions.length} but expected ${expectedCount}`);
    }
    
    // Check 2: Amount not divided properly
    // Calculate what the correct installment amount should be
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const expectedInstallmentAmount = totalAmount / transactions.length;
    
    let hasAmountProblems = false;
    for (const tx of transactions) {
      // Allow small rounding differences
      if (Math.abs(tx.amount - expectedInstallmentAmount) > 0.01) {
        hasAmountProblems = true;
        break;
      }
    }
    
    if (hasAmountProblems) {
      problems.push(`Amount not properly divided: transactions have varying amounts`);
    }
    
    // Check 3: Missing or incorrect installment_number
    let hasMissingNumbers = false;
    for (let i = 0; i < transactions.length; i++) {
      if (!transactions[i].installment_number || transactions[i].installment_number !== i + 1) {
        hasMissingNumbers = true;
        break;
      }
    }
    
    if (hasMissingNumbers) {
      problems.push('Missing or incorrect installment_number');
    }
    
    // Check 4: Dates not properly spaced (should be monthly)
    let hasDateProblems = false;
    if (transactions.length > 1) {
      const firstDate = parseLocalDate(transactions[0].date);
      const expectedDates = calculateInstallmentDates(transactions[0].date, transactions.length);
      
      for (let i = 0; i < transactions.length; i++) {
        if (transactions[i].date !== expectedDates[i]) {
          hasDateProblems = true;
          break;
        }
      }
    }
    
    if (hasDateProblems) {
      problems.push('Dates not properly spaced (should be monthly intervals)');
    }
    
    // Check 5: Description format
    let hasDescProblems = false;
    for (let i = 0; i < transactions.length; i++) {
      const expectedDesc = `${baseDesc} (${i + 1}/${transactions.length})`;
      if (transactions[i].description !== expectedDesc) {
        hasDescProblems = true;
        break;
      }
    }
    
    if (hasDescProblems) {
      problems.push('Description format incorrect');
    }
    
    if (problems.length > 0) {
      problematicGroups.push({
        baseDescription: baseDesc,
        userId,
        transactions,
        problems,
        totalAmount
      });
    }
  }
  
  return problematicGroups;
};

/**
 * Fix a group of problematic installment transactions
 */
const fixInstallmentGroup = async (group, dryRun = true) => {
  const { baseDescription, userId, transactions, totalAmount } = group;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 ${dryRun ? '[DRY RUN]' : '[EXECUTING]'} Fixing: ${baseDescription}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Total Amount: R$ ${totalAmount.toFixed(2)}`);
  console.log(`   Transactions to fix: ${transactions.length}`);
  console.log(`   Problems: ${group.problems.join(', ')}`);
  
  // Sort by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const installmentCount = transactions.length;
  const installmentAmount = totalAmount / installmentCount;
  const startDate = transactions[0].date;
  const expectedDates = calculateInstallmentDates(startDate, installmentCount);
  
  console.log(`\n   Corrections to apply:`);
  console.log(`   - Each installment amount: R$ ${installmentAmount.toFixed(2)}`);
  console.log(`   - Start date: ${startDate}`);
  console.log(`   - Date range: ${startDate} to ${expectedDates[installmentCount - 1]}`);
  
  const updates = [];
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const correctDate = expectedDates[i];
    const correctDescription = `${baseDescription} (${i + 1}/${installmentCount})`;
    const correctAmount = installmentAmount;
    const correctNumber = i + 1;
    
    const needsUpdate = 
      tx.amount !== correctAmount ||
      tx.date !== correctDate ||
      tx.description !== correctDescription ||
      tx.installment_number !== correctNumber;
    
    if (needsUpdate) {
      const updateData = {
        amount: correctAmount,
        date: correctDate,
        description: correctDescription,
        installment_number: correctNumber,
        installment_count: installmentCount,
        is_installment: true
      };
      
      updates.push({ id: tx.id, updateData });
      
      console.log(`\n   Transaction ${i + 1}/${installmentCount}:`);
      if (tx.amount !== correctAmount) {
        console.log(`     Amount: R$ ${tx.amount.toFixed(2)} → R$ ${correctAmount.toFixed(2)}`);
      }
      if (tx.date !== correctDate) {
        console.log(`     Date: ${tx.date} → ${correctDate}`);
      }
      if (tx.description !== correctDescription) {
        console.log(`     Description: "${tx.description}" → "${correctDescription}"`);
      }
      if (tx.installment_number !== correctNumber) {
        console.log(`     Number: ${tx.installment_number || 'null'} → ${correctNumber}`);
      }
    }
  }
  
  if (updates.length === 0) {
    console.log(`\n   ✅ No updates needed (already correct)`);
    return { success: true, updated: 0 };
  }
  
  if (dryRun) {
    console.log(`\n   ℹ️  DRY RUN: Would update ${updates.length} transactions`);
    return { success: true, updated: 0, wouldUpdate: updates.length };
  }
  
  // Execute updates
  console.log(`\n   🔄 Updating ${updates.length} transactions...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const { id, updateData } of updates) {
    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error(`     ❌ Error updating transaction ${id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`\n   ✅ Updated ${successCount} transactions successfully`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed to update ${errorCount} transactions`);
  }
  
  return { success: errorCount === 0, updated: successCount, errors: errorCount };
};

/**
 * Main migration function
 */
const runMigration = async (options = {}) => {
  const { userId = null, dryRun = true, limit = null } = options;
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     INSTALLMENT TRANSACTIONS MIGRATION                             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode - no changes will be made\n');
  } else {
    console.log('⚠️  Running in EXECUTE mode - changes WILL be made to the database\n');
  }
  
  // Identify problematic installments
  const problematicGroups = await identifyProblematicInstallments(userId);
  
  if (problematicGroups.length === 0) {
    console.log('✅ No problematic installment transactions found!\n');
    return { success: true, fixed: 0 };
  }
  
  console.log(`\n📋 Found ${problematicGroups.length} groups with problems:\n`);
  
  let totalFixed = 0;
  let totalErrors = 0;
  const groupsToFix = limit ? problematicGroups.slice(0, limit) : problematicGroups;
  
  for (const group of groupsToFix) {
    const result = await fixInstallmentGroup(group, dryRun);
    
    if (result.success) {
      totalFixed += result.updated || 0;
    } else {
      totalErrors += result.errors || 0;
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 MIGRATION SUMMARY:');
  console.log(`   - Groups analyzed: ${groupsToFix.length}`);
  
  if (dryRun) {
    const totalWouldUpdate = groupsToFix.reduce((sum, g) => sum + (g.transactions?.length || 0), 0);
    console.log(`   - Transactions that would be updated: ${totalWouldUpdate}`);
    console.log('\n💡 Run with dryRun=false to apply changes');
  } else {
    console.log(`   - Transactions updated: ${totalFixed}`);
    if (totalErrors > 0) {
      console.log(`   - Errors: ${totalErrors}`);
    }
  }
  
  console.log('\n');
  
  return { 
    success: totalErrors === 0, 
    fixed: totalFixed,
    errors: totalErrors,
    groupsAnalyzed: groupsToFix.length
  };
};

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const userId = args.find(arg => arg.startsWith('--user='))?.split('=')[1];
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('Fix Installment Transactions Migration Script');
    console.log('='.repeat(50));
    console.log('');
    console.log('Usage: node fix-installment-transactions.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --execute          Execute the migration (default: dry run)');
    console.log('  --user=USER_ID     Only fix transactions for specific user');
    console.log('  --limit=N          Only fix first N groups');
    console.log('  --help, -h         Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node fix-installment-transactions.js');
    console.log('  node fix-installment-transactions.js --execute');
    console.log('  node fix-installment-transactions.js --execute --limit=10');
    console.log('  node fix-installment-transactions.js --execute --user=abc123');
    console.log('');
    process.exit(0);
  }
  
  runMigration({ 
    userId, 
    dryRun, 
    limit 
  }).then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigration, identifyProblematicInstallments, fixInstallmentGroup };
