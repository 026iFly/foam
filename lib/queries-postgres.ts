/**
 * Database queries for Postgres (Vercel deployment)
 *
 * Usage: When deploying to Vercel, replace imports from './queries'
 * with './queries-postgres' in all page files.
 *
 * Or better: Use environment variable to switch automatically
 */

import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Types
export interface CompanyInfo {
  id: number;
  company_name: string;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  project_type: string | null;
  image_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  area_size: number | null;
  completion_date: string | null;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
}

export interface PricingConfig {
  id: number;
  foam_type: string;
  thickness: number;
  price_per_sqm: number;
}

export interface AdditionalCost {
  id: number;
  cost_name: string;
  amount: number;
  unit: string;
}

export interface ProjectMultiplier {
  id: number;
  project_type: string;
  multiplier: number;
}

// Company Info
export async function getCompanyInfo(): Promise<CompanyInfo> {
  const result = await pool.query('SELECT * FROM company_info WHERE id = 1');
  return result.rows[0] || {
    id: 1,
    company_name: 'Intellifoam',
    org_number: null,
    address: null,
    postal_code: null,
    city: null,
    phone: null,
    email: null,
    website: 'https://intellifoam.se',
    description: 'Professionell sprutisolering'
  };
}

// Projects
export async function getAllProjects(): Promise<Project[]> {
  const result = await pool.query('SELECT * FROM projects ORDER BY completion_date DESC');
  return result.rows;
}

export async function getProjectById(id: number): Promise<Project | null> {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// FAQs
export async function getAllFAQs(): Promise<FAQ[]> {
  const result = await pool.query('SELECT * FROM faqs ORDER BY sort_order, id');
  return result.rows;
}

export async function getFAQsByCategory(category: string): Promise<FAQ[]> {
  const result = await pool.query(
    'SELECT * FROM faqs WHERE category = $1 ORDER BY sort_order, id',
    [category]
  );
  return result.rows;
}

// Pricing
export async function getAllPricing(): Promise<PricingConfig[]> {
  const result = await pool.query('SELECT * FROM pricing_config ORDER BY foam_type, thickness');
  return result.rows;
}

export async function getPricingByType(foamType: string): Promise<PricingConfig[]> {
  const result = await pool.query(
    'SELECT * FROM pricing_config WHERE foam_type = $1 ORDER BY thickness',
    [foamType]
  );
  return result.rows;
}

export async function getAdditionalCosts(): Promise<AdditionalCost[]> {
  const result = await pool.query('SELECT * FROM additional_costs');
  return result.rows;
}

export async function getProjectMultipliers(): Promise<ProjectMultiplier[]> {
  const result = await pool.query('SELECT * FROM project_multipliers');
  return result.rows;
}

// Contact Submissions
export async function saveContactSubmission(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): Promise<void> {
  await pool.query(
    'INSERT INTO contact_submissions (name, email, phone, message) VALUES ($1, $2, $3, $4)',
    [data.name, data.email, data.phone || null, data.message]
  );
}

// Admin Updates
export async function updatePricing(id: number, price: number): Promise<void> {
  await pool.query(
    'UPDATE pricing_config SET price_per_sqm = $1 WHERE id = $2',
    [price, id]
  );
}

export async function updateAdditionalCost(id: number, amount: number): Promise<void> {
  await pool.query(
    'UPDATE additional_costs SET amount = $1 WHERE id = $2',
    [amount, id]
  );
}

export async function updateProjectMultiplier(id: number, multiplier: number): Promise<void> {
  await pool.query(
    'UPDATE project_multipliers SET multiplier = $1 WHERE id = $2',
    [multiplier, id]
  );
}

// Export pool for custom queries if needed
export { pool };
