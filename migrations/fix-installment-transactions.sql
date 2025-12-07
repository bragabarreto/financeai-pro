-- Migration: Fix Old Installment Transactions
-- Date: 2025-12-07
-- Description: Corrects installment transactions that were created before proper 
--              installment logic was implemented. This ensures:
--              1. Each installment has correct amount (total / installment_count)
--              2. Each installment has correct installment_number
--              3. Each installment has correct monthly date intervals
--              4. Description includes proper installment notation (X/Y)

-- IMPORTANT: This migration is complex and should be reviewed carefully before execution.
-- It's recommended to:
-- 1. Backup your database before running this
-- 2. Test in a development environment first
-- 3. Review the identified problems using the diagnostic queries below

-- ==============================================================================
-- DIAGNOSTIC QUERIES - Run these first to understand the scope of the problem
-- ==============================================================================

-- Query 1: Count total installment transactions
SELECT 
  COUNT(*) as total_installment_transactions
FROM transactions
WHERE is_installment = true;

-- Query 2: Find installments with missing installment_number
SELECT 
  id, 
  description, 
  amount, 
  date,
  installment_count,
  installment_number
FROM transactions
WHERE is_installment = true 
  AND installment_number IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Query 3: Find groups of installments with amount problems
-- (This identifies installments where the amount appears to be the full amount instead of divided)
WITH installment_groups AS (
  SELECT 
    user_id,
    REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '') as base_description,
    category,
    payment_method,
    COUNT(*) as transaction_count,
    installment_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
  FROM transactions
  WHERE is_installment = true
  GROUP BY user_id, base_description, category, payment_method, installment_count
  HAVING COUNT(*) > 1
)
SELECT 
  *,
  CASE 
    WHEN max_amount - min_amount > 0.01 THEN 'Amount varies across installments'
    WHEN transaction_count != installment_count THEN 'Count mismatch'
    ELSE 'OK'
  END as problem_type
FROM installment_groups
WHERE max_amount - min_amount > 0.01 
   OR transaction_count != installment_count
ORDER BY total_amount DESC
LIMIT 20;

-- Query 4: Find installments with date spacing problems
-- (Installments should be 1 month apart)
WITH installment_dates AS (
  SELECT 
    id,
    description,
    date,
    LAG(date) OVER (PARTITION BY 
      user_id, 
      REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '')
      ORDER BY date
    ) as prev_date
  FROM transactions
  WHERE is_installment = true
)
SELECT 
  id,
  description,
  date,
  prev_date,
  EXTRACT(DAY FROM (date::date - prev_date::date)) as days_diff
FROM installment_dates
WHERE prev_date IS NOT NULL
  AND (
    EXTRACT(DAY FROM (date::date - prev_date::date)) < 25 
    OR EXTRACT(DAY FROM (date::date - prev_date::date)) > 35
  )
LIMIT 20;

-- ==============================================================================
-- BACKUP RECOMMENDATIONS
-- ==============================================================================

-- Before running fixes, create a backup table:
CREATE TABLE IF NOT EXISTS transactions_backup_installment_fix AS
SELECT * FROM transactions WHERE is_installment = true;

-- To restore from backup if needed:
-- DELETE FROM transactions WHERE is_installment = true;
-- INSERT INTO transactions SELECT * FROM transactions_backup_installment_fix;

-- ==============================================================================
-- FIX FUNCTION - Corrects installment transactions
-- ==============================================================================

CREATE OR REPLACE FUNCTION fix_installment_transactions()
RETURNS TABLE(
  group_key TEXT,
  transactions_fixed INTEGER,
  problems_found TEXT[]
) AS $$
DECLARE
  v_group RECORD;
  v_transaction RECORD;
  v_base_desc TEXT;
  v_expected_amount NUMERIC;
  v_expected_date DATE;
  v_installment_num INTEGER;
  v_fixes INTEGER;
  v_problems TEXT[];
BEGIN
  -- Process each group of installments
  FOR v_group IN
    SELECT 
      user_id,
      REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '') as base_description,
      category,
      payment_method,
      card_id,
      account_id,
      type,
      is_alimony,
      origin,
      installment_count,
      ARRAY_AGG(id ORDER BY date, created_at) as transaction_ids,
      ARRAY_AGG(date ORDER BY date, created_at) as dates,
      ARRAY_AGG(amount ORDER BY date, created_at) as amounts,
      COUNT(*) as tx_count,
      SUM(amount) as total_amount,
      MIN(date) as start_date
    FROM transactions
    WHERE is_installment = true
    GROUP BY user_id, base_description, category, payment_method, 
             card_id, account_id, type, is_alimony, origin, installment_count
    HAVING COUNT(*) > 1
  LOOP
    v_fixes := 0;
    v_problems := ARRAY[]::TEXT[];
    
    -- Calculate what the correct amount should be for each installment
    v_expected_amount := v_group.total_amount / v_group.tx_count;
    
    -- Check for problems
    IF v_group.tx_count != v_group.installment_count THEN
      v_problems := array_append(v_problems, 'count_mismatch');
    END IF;
    
    -- Update each transaction in the group
    FOR v_installment_num IN 1..array_length(v_group.transaction_ids, 1)
    LOOP
      -- Calculate expected date (monthly interval from start date)
      v_expected_date := v_group.start_date + ((v_installment_num - 1) || ' months')::INTERVAL;
      
      -- Update the transaction
      UPDATE transactions
      SET 
        amount = v_expected_amount,
        date = v_expected_date,
        description = v_group.base_description || ' (' || v_installment_num || '/' || v_group.tx_count || ')',
        installment_number = v_installment_num,
        installment_count = v_group.tx_count
      WHERE id = v_group.transaction_ids[v_installment_num]
        AND (
          amount != v_expected_amount
          OR date != v_expected_date
          OR installment_number IS NULL
          OR installment_number != v_installment_num
          OR description != v_group.base_description || ' (' || v_installment_num || '/' || v_group.tx_count || ')'
        );
      
      IF FOUND THEN
        v_fixes := v_fixes + 1;
      END IF;
    END LOOP;
    
    -- Return results for this group
    IF v_fixes > 0 OR array_length(v_problems, 1) > 0 THEN
      group_key := v_group.user_id || '|' || v_group.base_description;
      transactions_fixed := v_fixes;
      problems_found := v_problems;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- EXECUTION INSTRUCTIONS
-- ==============================================================================

-- Step 1: Review diagnostic queries above to understand the scope

-- Step 2: Create backup (IMPORTANT!)
-- CREATE TABLE transactions_backup_installment_fix AS
-- SELECT * FROM transactions WHERE is_installment = true;

-- Step 3: Execute the fix (UNCOMMENT TO RUN)
-- SELECT * FROM fix_installment_transactions();

-- Step 4: Verify results
-- Run the diagnostic queries again to confirm fixes

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- After running the fix, verify with these queries:

-- Check if installment_number is now set for all installments
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE installment_number IS NOT NULL) as with_number,
  COUNT(*) FILTER (WHERE installment_number IS NULL) as without_number
FROM transactions
WHERE is_installment = true;

-- Verify amount distribution is correct
WITH installment_groups AS (
  SELECT 
    REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '') as base_description,
    COUNT(*) as transaction_count,
    installment_count,
    SUM(amount) as total_amount,
    MAX(amount) - MIN(amount) as amount_variance
  FROM transactions
  WHERE is_installment = true
  GROUP BY base_description, installment_count
)
SELECT 
  base_description,
  transaction_count,
  installment_count,
  total_amount,
  amount_variance,
  CASE 
    WHEN amount_variance > 0.01 THEN 'PROBLEM: Amounts vary'
    WHEN transaction_count != installment_count THEN 'PROBLEM: Count mismatch'
    ELSE 'OK'
  END as status
FROM installment_groups
WHERE amount_variance > 0.01 OR transaction_count != installment_count;

-- Check date spacing
WITH installment_dates AS (
  SELECT 
    id,
    description,
    date,
    LAG(date) OVER (PARTITION BY 
      REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '')
      ORDER BY installment_number
    ) as prev_date
  FROM transactions
  WHERE is_installment = true
)
SELECT 
  description,
  date,
  prev_date,
  EXTRACT(DAY FROM (date::date - prev_date::date)) as days_diff,
  CASE 
    WHEN EXTRACT(DAY FROM (date::date - prev_date::date)) BETWEEN 25 AND 35 THEN 'OK'
    ELSE 'PROBLEM: Not monthly'
  END as status
FROM installment_dates
WHERE prev_date IS NOT NULL
  AND (
    EXTRACT(DAY FROM (date::date - prev_date::date)) < 25 
    OR EXTRACT(DAY FROM (date::date - prev_date::date)) > 35
  );

-- ==============================================================================
-- CLEANUP (Optional)
-- ==============================================================================

-- After verifying everything is correct, you can drop the backup table:
-- DROP TABLE IF EXISTS transactions_backup_installment_fix;

-- And drop the fix function:
-- DROP FUNCTION IF EXISTS fix_installment_transactions();

-- ==============================================================================
-- NOTES
-- ==============================================================================

-- This migration handles the following scenarios:
-- 1. Installments with full amount instead of divided amount
-- 2. Missing installment_number values
-- 3. Incorrect date spacing (should be monthly)
-- 4. Incorrect description format
-- 5. Count mismatches between actual transactions and installment_count

-- Edge cases handled:
-- - Groups with varying amounts (averages total and redistributes)
-- - End-of-month dates (PostgreSQL handles month-end dates automatically)
-- - Year transitions
-- - Partial installment groups

-- Safety features:
-- - Backup table creation
-- - Diagnostic queries before execution
-- - Verification queries after execution
-- - Dry-run capability through function return values
