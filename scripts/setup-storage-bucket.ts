/**
 * Setup script to create the profile-photos storage bucket
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

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

  console.log('Creating profile-photos storage bucket...');

  // Create the bucket
  const { data, error } = await supabase.storage.createBucket('profile-photos', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists - OK');
    } else {
      console.error('Failed to create bucket:', error.message);
      process.exit(1);
    }
  } else {
    console.log('Bucket created successfully:', data);
  }

  console.log('\nStorage bucket setup complete!');
}

main().catch(console.error);
