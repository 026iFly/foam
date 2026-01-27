/**
 * Migration script: SQLite → Postgres (Vercel)
 *
 * Run this AFTER setting up Vercel Postgres:
 * 1. Create Vercel Postgres database
 * 2. Copy .env variables from Vercel to local .env.local
 * 3. Run: npx tsx lib/migrate-to-postgres.ts
 */

import Database from 'better-sqlite3';
import { Client } from 'pg';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL not found in environment variables');
  console.error('Please copy your Vercel Postgres connection string to .env.local');
  process.exit(1);
}

// Connect to SQLite (source)
const dbPath = path.join(process.cwd(), 'data', 'foam.db');
const sqlite = new Database(dbPath, { readonly: true });

// Connect to Postgres (destination)
const postgres = new Client({
  connectionString: POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  try {
    console.log('🔄 Starting migration from SQLite to Postgres...\n');

    await postgres.connect();
    console.log('✅ Connected to Postgres\n');

    // Drop existing tables (if re-running migration)
    console.log('🗑️  Dropping existing tables (if any)...');
    await postgres.query(`
      DROP TABLE IF EXISTS contact_submissions CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS faqs CASCADE;
      DROP TABLE IF EXISTS project_multipliers CASCADE;
      DROP TABLE IF EXISTS additional_costs CASCADE;
      DROP TABLE IF EXISTS pricing_config CASCADE;
      DROP TABLE IF EXISTS company_info CASCADE;
    `);
    console.log('✅ Existing tables dropped\n');

    // Create company_info table
    console.log('📋 Creating company_info table...');
    await postgres.query(`
      CREATE TABLE company_info (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        org_number TEXT,
        address TEXT,
        postal_code TEXT,
        city TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate company_info data
    const companyData = sqlite.prepare('SELECT * FROM company_info').all();
    for (const row of companyData) {
      await postgres.query(`
        INSERT INTO company_info (
          company_name, org_number, address, postal_code, city,
          phone, email, website, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        row.company_name, row.org_number, row.address, row.postal_code, row.city,
        row.phone, row.email, row.website, row.description, row.created_at, row.updated_at
      ]);
    }
    console.log(`✅ Migrated ${companyData.length} company_info records\n`);

    // Create projects table
    console.log('📋 Creating projects table...');
    await postgres.query(`
      CREATE TABLE projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        project_type TEXT,
        image_url TEXT,
        before_image_url TEXT,
        after_image_url TEXT,
        area_size REAL,
        completion_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate projects data
    const projectsData = sqlite.prepare('SELECT * FROM projects').all();
    for (const row of projectsData) {
      await postgres.query(`
        INSERT INTO projects (
          title, description, location, project_type, image_url,
          before_image_url, after_image_url, area_size, completion_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        row.title, row.description, row.location, row.project_type, row.image_url,
        row.before_image_url, row.after_image_url, row.area_size, row.completion_date, row.created_at
      ]);
    }
    console.log(`✅ Migrated ${projectsData.length} project records\n`);

    // Create faqs table
    console.log('📋 Creating faqs table...');
    await postgres.query(`
      CREATE TABLE faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate faqs data
    const faqsData = sqlite.prepare('SELECT * FROM faqs').all();
    for (const row of faqsData) {
      await postgres.query(`
        INSERT INTO faqs (question, answer, category, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [row.question, row.answer, row.category, row.sort_order, row.created_at]);
    }
    console.log(`✅ Migrated ${faqsData.length} FAQ records\n`);

    // Create contact_submissions table
    console.log('📋 Creating contact_submissions table...');
    await postgres.query(`
      CREATE TABLE contact_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Contact submissions table created (empty)\n');

    // Create pricing_config table
    console.log('📋 Creating pricing_config table...');
    await postgres.query(`
      CREATE TABLE pricing_config (
        id SERIAL PRIMARY KEY,
        foam_type TEXT NOT NULL,
        thickness INTEGER NOT NULL,
        price_per_sqm REAL NOT NULL,
        UNIQUE(foam_type, thickness)
      )
    `);

    // Migrate pricing data
    const pricingData = sqlite.prepare('SELECT * FROM pricing_config').all();
    for (const row of pricingData) {
      await postgres.query(`
        INSERT INTO pricing_config (foam_type, thickness, price_per_sqm)
        VALUES ($1, $2, $3)
      `, [row.foam_type, row.thickness, row.price_per_sqm]);
    }
    console.log(`✅ Migrated ${pricingData.length} pricing records\n`);

    // Create additional_costs table
    console.log('📋 Creating additional_costs table...');
    await postgres.query(`
      CREATE TABLE additional_costs (
        id SERIAL PRIMARY KEY,
        cost_name TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL,
        unit TEXT NOT NULL
      )
    `);

    // Migrate additional costs
    const costsData = sqlite.prepare('SELECT * FROM additional_costs').all();
    for (const row of costsData) {
      await postgres.query(`
        INSERT INTO additional_costs (cost_name, amount, unit)
        VALUES ($1, $2, $3)
      `, [row.cost_name, row.amount, row.unit]);
    }
    console.log(`✅ Migrated ${costsData.length} additional cost records\n`);

    // Create project_multipliers table
    console.log('📋 Creating project_multipliers table...');
    await postgres.query(`
      CREATE TABLE project_multipliers (
        id SERIAL PRIMARY KEY,
        project_type TEXT NOT NULL UNIQUE,
        multiplier REAL NOT NULL
      )
    `);

    // Migrate multipliers
    const multipliersData = sqlite.prepare('SELECT * FROM project_multipliers').all();
    for (const row of multipliersData) {
      await postgres.query(`
        INSERT INTO project_multipliers (project_type, multiplier)
        VALUES ($1, $2)
      `, [row.project_type, row.multiplier]);
    }
    console.log(`✅ Migrated ${multipliersData.length} project multiplier records\n`);

    console.log('🎉 Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Company info: ${companyData.length} records`);
    console.log(`  - Projects: ${projectsData.length} records`);
    console.log(`  - FAQs: ${faqsData.length} records`);
    console.log(`  - Pricing: ${pricingData.length} records`);
    console.log(`  - Additional costs: ${costsData.length} records`);
    console.log(`  - Project multipliers: ${multipliersData.length} records`);
    console.log('\n✅ Database ready for Vercel deployment!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await postgres.end();
    sqlite.close();
  }
}

// Run migration
migrate();
