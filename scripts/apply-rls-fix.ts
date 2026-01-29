/**
 * Apply fixed RLS policies to user_profiles table
 *
 * Usage:
 *   export $(cat .env.local | grep -v '^#' | xargs) && npx tsx scripts/apply-rls-fix.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Applying RLS policy fixes...');

  // Read SQL file
  const sqlPath = path.join(__dirname, 'fix-rls-policies.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split into individual statements and execute each
  const statements = sql
    .split(/;(?=\s*(?:--|CREATE|DROP|ALTER|$))/g)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    console.log('Executing:', statement.substring(0, 60) + '...');

    // Use raw SQL execution via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: statement + ';',
      }),
    });

    if (!response.ok) {
      // Try alternative approach - direct database connection if available
      console.log('Note: Direct SQL execution not available via REST API.');
      console.log('Please run the SQL file manually in Supabase Dashboard -> SQL Editor');
      console.log('File location: scripts/fix-rls-policies.sql');
      break;
    }
  }

  console.log('\nTo apply these changes, please:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of scripts/fix-rls-policies.sql');
  console.log('4. Click "Run"');
}

main().catch(console.error);
