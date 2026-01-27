const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'foam.db');
const db = new Database(dbPath);

console.log('Adding ROT columns to quote_requests table...');

// Check if columns already exist
const tableInfo = db.prepare("PRAGMA table_info(quote_requests)").all();
const columnNames = tableInfo.map(col => col.name);

if (!columnNames.includes('rot_customer_info')) {
  db.exec(`ALTER TABLE quote_requests ADD COLUMN rot_customer_info TEXT`);
  console.log('Added rot_customer_info column');
} else {
  console.log('rot_customer_info column already exists');
}

if (!columnNames.includes('rot_info_token')) {
  db.exec(`ALTER TABLE quote_requests ADD COLUMN rot_info_token TEXT`);
  console.log('Added rot_info_token column');
} else {
  console.log('rot_info_token column already exists');
}

// Create index for token lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_requests_rot_token ON quote_requests(rot_info_token)`);
console.log('Created index for rot_info_token');

// Verify table structure
const updatedTableInfo = db.prepare("PRAGMA table_info(quote_requests)").all();
console.log('\nUpdated table structure:');
console.table(updatedTableInfo);

db.close();
console.log('\nDatabase migration complete!');
