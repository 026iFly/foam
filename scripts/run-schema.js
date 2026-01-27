// Script to run schema.sql in Supabase
// Run with: node scripts/run-schema.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function runSchema() {
  console.log('Running schema.sql in Supabase...\n');

  // Read schema file
  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Supabase uses the REST API - we need to use the SQL endpoint
  // This requires the service role key and hitting the /rest/v1/rpc endpoint
  // But for raw SQL, we need to use the pg-meta API

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

  // Use the Supabase SQL API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query: schema
    })
  });

  if (!response.ok) {
    // The RPC endpoint won't work for raw SQL
    // Let's provide instructions instead
    console.log('Note: Direct SQL execution via API requires database functions.');
    console.log('\nPlease run the schema manually:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('2. Copy the contents of: supabase/schema.sql');
    console.log('3. Paste and click "Run"\n');
    console.log('Or, you can use the Supabase CLI:\n');
    console.log('  npx supabase db push\n');

    // Let's try to at least verify by inserting test data
    return false;
  }

  console.log('Schema executed successfully!');
  return true;
}

// Alternative: Use supabase-js to create tables one by one
async function createTablesManually() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n--- Schema Instructions ---\n');
  console.log('Please run the schema SQL in Supabase SQL Editor:');
  console.log('');
  console.log('1. Open: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to "SQL Editor" in the left sidebar');
  console.log('4. Click "New query"');
  console.log('5. Copy ALL contents from: supabase/schema.sql');
  console.log('6. Paste into the editor and click "Run"');
  console.log('');
  console.log('The schema file is located at:');
  console.log('  ' + path.join(__dirname, '..', 'supabase', 'schema.sql'));
  console.log('');
}

runSchema().catch(() => {
  createTablesManually();
});
