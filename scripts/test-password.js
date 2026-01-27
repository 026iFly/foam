/**
 * Test if password matches the hash
 */

const bcrypt = require('bcrypt');

const password = 'Jko93po0';
const hash = '$2b$10$.iYVScy8znDxxJwT/L3BXevxBTDDWWWL/zKeJMToy6Xl2KwT.dPOy';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('\nPassword:', password);
  console.log('Hash:', hash);
  console.log('Match:', result ? '✅ YES' : '❌ NO');

  if (!result) {
    console.log('\n🔄 Generating new hash for the same password...\n');
    bcrypt.hash(password, 10, (err, newHash) => {
      if (!err) {
        console.log('New hash:', newHash);
        console.log('\nUpdate your .env.local with:');
        console.log(`ADMIN_PASSWORD_HASH=${newHash}`);
      }
    });
  }
});
