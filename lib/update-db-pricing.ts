import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'foam.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create pricing configuration table
db.exec(`
  CREATE TABLE IF NOT EXISTS pricing_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    foam_type TEXT NOT NULL, -- 'closed' or 'open'
    thickness_mm INTEGER NOT NULL,
    price_per_m2_excl_vat REAL NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(foam_type, thickness_mm)
  )
`);

// Create additional costs table
db.exec(`
  CREATE TABLE IF NOT EXISTS additional_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cost_type TEXT NOT NULL UNIQUE,
    description TEXT,
    amount REAL NOT NULL,
    unit TEXT, -- 'fixed', 'per_day', 'per_hour', etc.
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create project type multipliers table
db.exec(`
  CREATE TABLE IF NOT EXISTS project_multipliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_type TEXT NOT NULL UNIQUE,
    multiplier REAL NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert pricing from Polyterm quote (closed-cell prices)
const checkPricing = db.prepare('SELECT COUNT(*) as count FROM pricing_config').get() as { count: number };

if (checkPricing.count === 0) {
  const insertPricing = db.prepare(`
    INSERT INTO pricing_config (foam_type, thickness_mm, price_per_m2_excl_vat)
    VALUES (?, ?, ?)
  `);

  // Closed-cell prices from Polyterm quote
  insertPricing.run('closed', 50, 365);
  insertPricing.run('closed', 70, 420);
  insertPricing.run('closed', 100, 500);
  insertPricing.run('closed', 120, 550);

  // Open-cell prices (estimated at 20% less than closed-cell)
  insertPricing.run('open', 50, 292);
  insertPricing.run('open', 70, 336);
  insertPricing.run('open', 100, 400);
  insertPricing.run('open', 120, 440);

  console.log('✓ Pricing configuration initialized');
}

// Insert additional costs
const checkCosts = db.prepare('SELECT COUNT(*) as count FROM additional_costs').get() as { count: number };

if (checkCosts.count === 0) {
  const insertCost = db.prepare(`
    INSERT INTO additional_costs (cost_type, description, amount, unit)
    VALUES (?, ?, ?, ?)
  `);

  insertCost.run('setup_fee', 'Resor/etablerings kostnader', 4500, 'fixed');
  insertCost.run('generator', 'Elverk mod QAS 40', 2000, 'per_day');
  insertCost.run('extra_work', 'Intäckning, renskärning, ställtid etc', 625, 'per_hour');
  insertCost.run('rot_deduction', 'ROT-avdrag (schablon)', -10, 'percent');

  console.log('✓ Additional costs initialized');
}

// Insert project multipliers
const checkMultipliers = db.prepare('SELECT COUNT(*) as count FROM project_multipliers').get() as { count: number };

if (checkMultipliers.count === 0) {
  const insertMultiplier = db.prepare(`
    INSERT INTO project_multipliers (project_type, multiplier, description)
    VALUES (?, ?, ?)
  `);

  insertMultiplier.run('vind', 1.0, 'Vindsbjälklag/tak - standardpris');
  insertMultiplier.run('vagg', 1.2, 'Vägg - mer komplicerat');
  insertMultiplier.run('kallare', 1.15, 'Källare - kräver förberedelse');
  insertMultiplier.run('krypgrund', 1.3, 'Krypgrund - svåråtkomligt');
  insertMultiplier.run('garage', 1.0, 'Garage - standardpris');

  console.log('✓ Project multipliers initialized');
}

db.close();
console.log('✓ Pricing database updated successfully');
