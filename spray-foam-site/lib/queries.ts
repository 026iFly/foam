import { supabase } from './supabase';

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
  thickness_mm: number;
  price_per_m2_excl_vat: number;
  is_active: boolean;
}

export interface AdditionalCost {
  id: number;
  cost_type: string;
  description: string | null;
  amount: number;
  unit: string | null;
  is_active: boolean;
}

export interface ProjectMultiplier {
  id: number;
  project_type: string;
  multiplier: number;
  description: string | null;
  is_active: boolean;
}

export async function getCompanyInfo(): Promise<CompanyInfo | null> {
  const { data, error } = await supabase
    .from('company_info')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching company info:', error);
    return null;
  }

  return data;
}

export async function getAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('completion_date', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data || [];
}

export async function getAllFAQs(): Promise<FAQ[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }

  return data || [];
}

export async function getFAQsByCategory(category: string): Promise<FAQ[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching FAQs by category:', error);
    return [];
  }

  return data || [];
}

export async function saveContactSubmission(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  project_type?: string;
}): Promise<{ id: number } | null> {
  const { data: result, error } = await supabase
    .from('contact_submissions')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      message: data.message,
      project_type: data.project_type || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving contact submission:', error);
    return null;
  }

  return result;
}

// Pricing queries
export async function getAllPricing(): Promise<PricingConfig[]> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .order('foam_type')
    .order('thickness_mm');

  if (error) {
    console.error('Error fetching pricing:', error);
    return [];
  }

  return data || [];
}

export async function getPricingByType(foamType: string): Promise<PricingConfig[]> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('foam_type', foamType)
    .eq('is_active', true)
    .order('thickness_mm');

  if (error) {
    console.error('Error fetching pricing by type:', error);
    return [];
  }

  return data || [];
}

export async function getPricingById(id: number): Promise<PricingConfig | undefined> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    console.error('Error fetching pricing by id:', error);
    return undefined;
  }

  return data;
}

export async function updatePricing(id: number, price: number): Promise<boolean> {
  const { error } = await supabase
    .from('pricing_config')
    .update({ price_per_m2_excl_vat: price })
    .eq('id', id);

  if (error) {
    console.error('Error updating pricing:', error);
    return false;
  }

  return true;
}

export async function getAllAdditionalCosts(): Promise<AdditionalCost[]> {
  const { data, error } = await supabase
    .from('additional_costs')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching additional costs:', error);
    return [];
  }

  return data || [];
}

export async function updateAdditionalCost(id: number, amount: number): Promise<boolean> {
  const { error } = await supabase
    .from('additional_costs')
    .update({ amount })
    .eq('id', id);

  if (error) {
    console.error('Error updating additional cost:', error);
    return false;
  }

  return true;
}

export async function getAllProjectMultipliers(): Promise<ProjectMultiplier[]> {
  const { data, error } = await supabase
    .from('project_multipliers')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching project multipliers:', error);
    return [];
  }

  return data || [];
}

export async function getProjectMultiplier(projectType: string): Promise<ProjectMultiplier | undefined> {
  const { data, error } = await supabase
    .from('project_multipliers')
    .select('*')
    .eq('project_type', projectType)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    console.error('Error fetching project multiplier:', error);
    return undefined;
  }

  return data;
}

export async function updateProjectMultiplier(id: number, multiplier: number): Promise<boolean> {
  const { error } = await supabase
    .from('project_multipliers')
    .update({ multiplier })
    .eq('id', id);

  if (error) {
    console.error('Error updating project multiplier:', error);
    return false;
  }

  return true;
}

export interface BuildingPhysicsVariable {
  variable_key: string;
  variable_value: number;
}

export async function getBuildingPhysicsVariables(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('cost_variables')
    .select('variable_key, variable_value')
    .eq('category', 'Building Physics');

  if (error) {
    console.error('Error fetching building physics variables:', error);
    return {};
  }

  const result: Record<string, number> = {};
  for (const row of data || []) {
    result[row.variable_key] = row.variable_value;
  }
  return result;
}

// Cost variables queries
export interface CostVariable {
  id: number;
  variable_key: string;
  variable_value: number;
  variable_unit: string | null;
  description: string | null;
  category: string | null;
}

export async function getAllCostVariables(): Promise<CostVariable[]> {
  const { data, error } = await supabase
    .from('cost_variables')
    .select('*')
    .order('category')
    .order('variable_key');

  if (error) {
    console.error('Error fetching cost variables:', error);
    return [];
  }

  return data || [];
}

export async function getCostVariablesMap(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('cost_variables')
    .select('variable_key, variable_value');

  if (error) {
    console.error('Error fetching cost variables map:', error);
    return {};
  }

  const result: Record<string, number> = {};
  for (const row of data || []) {
    result[row.variable_key] = row.variable_value;
  }
  return result;
}

export async function updateCostVariable(key: string, value: number): Promise<boolean> {
  const { error } = await supabase
    .from('cost_variables')
    .update({ variable_value: value })
    .eq('variable_key', key);

  if (error) {
    console.error('Error updating cost variable:', error);
    return false;
  }

  return true;
}
