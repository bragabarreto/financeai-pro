import { createClient } from '@supabase/supabase-js';

// Exemplo (use suas próprias credenciais)
const supabaseUrl = https://ubyvdvtlyhrmvplroiqf.supabase.co;
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjgxMzcsImV4cCI6MjA3NTAwNDEzN30.dgPykHdUGxe99FnImqphLnT-xV5VNwgnPZzmxhYw3dQ;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
