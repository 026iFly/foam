#!/usr/bin/env node

/**
 * Add condensation safety margin variable to database
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'foam.db');
const db = new Database(dbPath);

try {
  console.log('Adding condensation safety margin...');

  // Check if it already exists
  const exists = db.prepare('SELECT id FROM cost_variables WHERE variable_key = ?').get('condensation_safety_margin_c');

  if (!exists) {
    db.prepare(`
      INSERT INTO cost_variables (variable_key, variable_value, variable_unit, description, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'condensation_safety_margin_c',
      2.0,
      '°C',
      'Säkerhetsmarginal över daggpunkt för gränsskikt mellan closed/open cell',
      'Building Physics'
    );
    console.log('✓ Added condensation_safety_margin_c = 2.0°C');
  } else {
    console.log('✓ Variable already exists');
  }

  // Also add foam switching time
  const switchExists = db.prepare('SELECT id FROM cost_variables WHERE variable_key = ?').get('foam_switching_hours');

  if (!switchExists) {
    db.prepare(`
      INSERT INTO cost_variables (variable_key, variable_value, variable_unit, description, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'foam_switching_hours',
      1.0,
      'h',
      'Extra arbetstid för att byta mellan skumtyper (flash-and-batt)',
      'Personnel & Equipment'
    );
    console.log('✓ Added foam_switching_hours = 1.0h');
  } else {
    console.log('✓ Foam switching variable already exists');
  }

  console.log('\n✓ Migration completed successfully!');

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
