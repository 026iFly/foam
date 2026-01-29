/**
 * Setup script to create the first admin user
 *
 * Usage:
 *   npx tsx scripts/setup-first-admin.ts
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAIL (or uses default)
 *   ADMIN_PASSWORD (or prompts)
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'pelle@gronteknik.nu';
const ADMIN_FIRST_NAME = 'Pelle';
const ADMIN_LAST_NAME = 'Stensson';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

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

  console.log('Setting up first admin user...');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Name: ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);

  // Get password
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await prompt('Enter password for admin user: ');
    if (!password || password.length < 6) {
      console.error('Password must be at least 6 characters');
      process.exit(1);
    }
  }

  // Check if user already exists
  const { data: existingUsers } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL);

  if (existingUsers && existingUsers.length > 0) {
    console.log('Admin user already exists. Updating role to admin...');

    // Update role to admin
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('email', ADMIN_EMAIL);

    if (updateError) {
      console.error('Failed to update user role:', updateError.message);
      process.exit(1);
    }

    console.log('User role updated to admin.');
    process.exit(0);
  }

  // Create user in Supabase Auth
  console.log('Creating user in Supabase Auth...');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: password,
    email_confirm: true,
    user_metadata: {
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      role: 'admin',
    },
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  if (!authData.user) {
    console.error('No user returned from auth creation');
    process.exit(1);
  }

  console.log('Auth user created:', authData.user.id);

  // Create user profile
  console.log('Creating user profile...');

  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email: ADMIN_EMAIL,
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      role: 'admin',
    });

  if (profileError) {
    console.error('Failed to create user profile:', profileError.message);
    // Clean up auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log('\nAdmin user created successfully!');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log('Role: admin');
  console.log('\nYou can now log in at /login');
}

main().catch(console.error);
