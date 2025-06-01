import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://qosqmdcoocyvrxsgtcls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvc3FtZGNvb2N5dnJ4c2d0Y2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzkwMTEsImV4cCI6MjA2NDMxNTAxMX0.tJHAAg_V-zAYTfGigVB-jO45t24JYJ98vbX7K_eRfgU';

// Validate credentials
if (SUPABASE_URL.includes('YOUR_SUPABASE') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
  console.error('🚨 Please update your Supabase credentials in src/services/supabase.js');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);