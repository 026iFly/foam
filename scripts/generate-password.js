/**
 * Generate password hash for admin login
 *
 * Usage: node scripts/generate-password.js YOUR_PASSWORD
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password');
  console.log('\nUsage: node scripts/generate-password.js YOUR_PASSWORD');
  console.log('Example: node scripts/generate-password.js MySecurePassword123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Error: Password must be at least 8 characters');
  process.exit(1);
}

console.log('\n🔐 Generating password hash...\n');

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Error generating hash:', err);
    process.exit(1);
  }

  console.log('✅ Password hash generated!\n');
  console.log('Add this to your .env.local file:\n');
  console.log('─'.repeat(80));
  console.log(`ADMIN_USERNAME=admin`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`SESSION_SECRET=${require('crypto').randomBytes(32).toString('base64')}`);
  console.log('─'.repeat(80));
  console.log('\nFor Vercel deployment, add these to Environment Variables in Project Settings.\n');
});
