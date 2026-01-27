const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'foam.db');
const db = new Database(dbPath);

console.log('Adding cost_variables table...');

// Create cost_variables table
db.exec(`
  CREATE TABLE IF NOT EXISTS cost_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_key TEXT NOT NULL UNIQUE,
    variable_value REAL NOT NULL,
    variable_unit TEXT,
    description TEXT,
    category TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('Cost_variables table created');

// Insert default values
const insert = db.prepare(`
  INSERT OR REPLACE INTO cost_variables (variable_key, variable_value, variable_unit, description, category)
  VALUES (?, ?, ?, ?, ?)
`);

const defaultValues = [
  // Closed cell foam
  ['closed_material_cost', 45, 'kr/kg', 'Material cost for closed cell foam per kg', 'closed_foam'],
  ['closed_margin', 30, '%', 'Profit margin percentage for closed cell foam', 'closed_foam'],
  ['closed_density', 35, 'kg/m³', 'Density of closed cell foam', 'closed_foam'],
  ['closed_spray_time', 0.5, 'hours/m³', 'Time required to spray 1 m³ of closed cell foam', 'closed_foam'],

  // Open cell foam
  ['open_material_cost', 25, 'kr/kg', 'Material cost for open cell foam per kg', 'open_foam'],
  ['open_margin', 30, '%', 'Profit margin percentage for open cell foam', 'open_foam'],
  ['open_density', 10, 'kg/m³', 'Density of open cell foam', 'open_foam'],
  ['open_spray_time', 0.4, 'hours/m³', 'Time required to spray 1 m³ of open cell foam', 'open_foam'],

  // Personnel
  ['personnel_cost_per_hour', 625, 'kr/hour', 'Labor cost per hour', 'personnel'],

  // Generator
  ['generator_cost', 2000, 'kr', 'Cost for portable generator (if no 3-phase outlet)', 'equipment'],

  // Travel
  ['travel_base_cost', 1500, 'kr', 'Base travel/setup cost', 'travel'],
  ['travel_cost_per_km', 15, 'kr/km', 'Cost per kilometer from Gävle', 'travel'],
  ['company_address', 0, 'text', 'Elektrikergatan 3, 80291 Gävle', 'travel']
];

for (const values of defaultValues) {
  insert.run(...values);
}

console.log('Default cost variables inserted');
console.log('\nCurrent cost variables:');

const all = db.prepare('SELECT * FROM cost_variables ORDER BY category, variable_key').all();
console.table(all);

db.close();
console.log('\nDatabase migration complete!');
