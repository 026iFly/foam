#!/usr/bin/env node

/**
 * Migration script to update cost model:
 * 1. Remove ROT-avdrag from additional_costs (it's not a template)
 * 2. Add setup_hours to cost_variables
 * 3. Add average_travel_speed_kmh to cost_variables
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'foam.db');
const db = new Database(dbPath);

try {
  console.log('Starting labor cost migration...');

  // Add setup hours to cost_variables if not exists
  const setupExists = db.prepare('SELECT id FROM cost_variables WHERE variable_key = ?').get('setup_hours');
  if (!setupExists) {
    db.prepare(`
      INSERT INTO cost_variables (variable_key, variable_value, variable_unit, description, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'setup_hours',
      2.0,
      'h',
      'Etableringstid per uppdrag (ingår i arbetskostnad)',
      'Personnel & Equipment'
    );
    console.log('✓ Added setup_hours variable (2.0 hours)');
  }

  // Add average travel speed to cost_variables if not exists
  const speedExists = db.prepare('SELECT id FROM cost_variables WHERE variable_key = ?').get('average_travel_speed_kmh');
  if (!speedExists) {
    db.prepare(`
      INSERT INTO cost_variables (variable_key, variable_value, variable_unit, description, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'average_travel_speed_kmh',
      80,
      'km/h',
      'Genomsnittlig körhastighet för restidsberäkning',
      'Travel & Transportation'
    );
    console.log('✓ Added average_travel_speed_kmh variable (80 km/h)');
  }

  console.log('\n✓ Migration completed successfully!');
  console.log('\nNew labor cost model:');
  console.log('- Labor = (spray hours + setup hours + travel hours) × hourly rate');
  console.log('- ROT-avdrag = 30% of total labor cost (after VAT)');
  console.log('- Travel hours = (distance × 2) / average speed');

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
