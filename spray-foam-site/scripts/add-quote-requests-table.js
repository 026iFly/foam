const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'foam.db');
const db = new Database(dbPath);

console.log('Adding quote_requests table...');

// Create quote_requests table
db.exec(`
  CREATE TABLE IF NOT EXISTS quote_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Customer info
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT NOT NULL,
    project_type TEXT,
    message TEXT,

    -- Calculation data (JSON)
    calculation_data TEXT NOT NULL,

    -- Climate parameters
    climate_zone TEXT,
    indoor_temp REAL,
    indoor_rh REAL,
    has_three_phase INTEGER,
    apply_rot_deduction INTEGER DEFAULT 0,

    -- Totals (denormalized)
    total_area REAL,
    total_excl_vat INTEGER,
    total_incl_vat INTEGER,
    rot_deduction INTEGER DEFAULT 0,

    -- Workflow
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    adjusted_data TEXT,
    adjusted_total_excl_vat INTEGER,
    adjusted_total_incl_vat INTEGER,

    -- Quote document
    quote_number TEXT UNIQUE,
    quote_pdf_path TEXT,
    quote_valid_until DATE,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_sent_at DATETIME
  )
`);

console.log('quote_requests table created');

// Create index for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
  CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at);
  CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_email ON quote_requests(customer_email);
`);

console.log('Indexes created');

// Verify table structure
const tableInfo = db.prepare("PRAGMA table_info(quote_requests)").all();
console.log('\nTable structure:');
console.table(tableInfo);

db.close();
console.log('\nDatabase migration complete!');
