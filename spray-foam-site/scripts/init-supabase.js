// Script to initialize Supabase database
// Run with: node scripts/init-supabase.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDatabase() {
  console.log('Initializing Supabase database...');
  console.log('URL:', supabaseUrl);

  try {
    // Test connection by trying to select from a table
    const { data, error } = await supabase
      .from('company_info')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('Tables do not exist yet. Please run the schema.sql in Supabase SQL Editor.');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/wmmgjoylxugeplwcpkhn/sql');
      console.log('2. Copy the contents of supabase/schema.sql');
      console.log('3. Paste and run in the SQL Editor\n');
      return false;
    } else if (error) {
      console.error('Connection error:', error.message);
      return false;
    }

    console.log('✓ Database connection successful!');
    console.log('✓ Tables exist');

    // Check if we have data
    const { count: companyCount } = await supabase
      .from('company_info')
      .select('*', { count: 'exact', head: true });

    const { count: faqCount } = await supabase
      .from('faqs')
      .select('*', { count: 'exact', head: true });

    const { count: costVarCount } = await supabase
      .from('cost_variables')
      .select('*', { count: 'exact', head: true });

    console.log(`  - company_info: ${companyCount || 0} rows`);
    console.log(`  - faqs: ${faqCount || 0} rows`);
    console.log(`  - cost_variables: ${costVarCount || 0} rows`);

    return true;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

initDatabase().then(success => {
  if (success) {
    console.log('\n✓ Database is ready!');
  } else {
    console.log('\n✗ Database setup incomplete');
    process.exit(1);
  }
});
